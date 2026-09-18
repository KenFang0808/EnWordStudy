# AI 单词视频项目说明

这是一个基于 `Remotion + React + TypeScript` 的短视频生成项目，当前主要用于批量生成英语单词讲解视频。

项目会把一个主题词或主题输入，依次转换为：

- `script`：口播脚本
- `storyboard`：分镜数据
- `voice`：逐场景配音
- `music`：背景音乐
- `captions`：字幕
- `video`：最终 MP4 成片

当前仓库已经针对“单词学习视频”做了一些定制，包括：

- `data/words/catalog.json` 外置单词词库
- 音标、词性、释义、搭配、例句、易混词和记忆钩子
- 本地 `index-tts` 音色接入
- ElevenLabs / Fish Audio / OpenAI / `index-tts` 的 TTS 回退链路
- 完整情境例句和收尾记忆钩子
- 跨镜复读、例句质量和画面信息重复检查

## 1. 技术栈

- `Remotion`
- `React 19`
- `TypeScript`
- `Zod`
- `Tailwind CSS`
- 本地 `index-tts`
- 可选云端 TTS：
  - `ElevenLabs`
  - `Fish Audio`
  - `OpenAI`

## 2. 当前生成流程

主生成管线位于 [generateVideo.ts](file:///Users/bytedance/ai-video/src/pipeline/generateVideo.ts)。

标准流程如下：

1. 读取输入参数或 `data/input.json`
2. 生成脚本 `data/script.json`
3. 生成分镜 `data/storyboard.json`
4. 应用纯图形视觉样式
5. 生成配音
6. 生成背景音乐
7. 生成句级字幕并高亮目标词
8. 渲染 QA 预览帧
9. 执行单词教学内容 QA
10. 渲染最终视频到 `output/final/<单词>-<音色>-<语速>-v<版本>.mp4`

项目只接受一个英文单词作为 `topic`，不会再退化为通用演讲或主题讲解模板。

## 3. 项目结构

核心目录约定在 [assets.ts](file:///Users/bytedance/ai-video/src/utils/assets.ts)：

- `data/input.json`：本次生成请求
- `data/script.json`：脚本文案
- `data/storyboard.json`：分镜数据
- `public/audio/voice/`：各场景配音
- `public/audio/music/`：背景音乐
- `output/previews/`：预览帧和中间预览产物
- `output/final/`：最终 MP4 成片，文件名形如 `tantrum-bill-1p1x-v1.mp4`

主要代码目录：

- `src/pipeline/`：主生成管线
- `src/agents/`：各个 Agent
- `src/remotion/`：Remotion 场景与组件
- `src/models/`：数据结构与 schema
- `src/utils/`：工具函数和路径管理

## 4. 脚本生成逻辑

脚本生成入口在 [scriptAgent.ts](file:///Users/bytedance/ai-video/src/agents/scriptAgent.ts)。

当前逻辑只服务单词讲解：

1. 按单词和语言风格读取 `data/words/catalog.json` 中的结构化词条
2. 本地没有对应风格的词条且配置了 `OPENAI_API_KEY` 时，调用单词专用提示词生成
3. 两者都不可用时立即报错，不会回退到通用主题或演讲脚本

词条通过 `style` 区分 `en`（纯英文）和 `bilingual`（英文单词、搭配和例句，中文解释）。同一个单词可以各存一条，彼此不会覆盖；未写 `style` 的旧词条默认是 `en`。每个词条包含两部分：一是音标、词性、释义、记忆钩子、三个完整例句这类元信息，二是人工撰写的讲解文案，即开场句、四个小节（`meaning` / `usage` / `examples` / `contrast`，各自带标题、旁白和三个要点）和收尾句。

`scriptAgent` 直接使用词条里的文案原文，不会把元信息拼接成句子，以保证口播自然。脚本长度只校验目标时长对应的下限，避免手写的好文案被长度上限拒绝。

## 5. 分镜与收尾逻辑

分镜逻辑位于 [storyboardAgent.ts](file:///Users/bytedance/ai-video/src/agents/storyboardAgent.ts)。

当前固定场景规划为：

- `intro`
- `definition`
- `usage`
- `examples`
- `contrast`
- `memory`
- `outro`

七镜现在按“单词亮相 → 分层教学 → 主动回忆”组织：

- `intro` 从第 0 帧就完整显示单词、音标、词性和释义，且不做入场动画，因为首帧会直接用作封面
- `definition` 只解释核心含义和语气
- `usage` 只教自然搭配与可复用句型
- `examples` 展示三个完整、具体且情境不同的句子，不再叠加底部字幕
- `contrast` 给出近义词选择规则
- `memory` 保留一句记忆钩子
- `outro` 用词条 `closing` 的收尾句居中收束

每镜右上角显示进度（例如 `4 / 7`），让观众明确剩余长度。词库旧稿里 “These examples show...” 这类例句复述会在脚本阶段自动移除。

QA 会守住封面这条底线：`intro` 的标题必须是目标词，必须带音标和词性，且入场动画必须是 `none`，否则直接报错。

分镜阶段根据文案词数和约 145 词/分钟的语速预估时长，真正的时长由语音决定：`voiceAgent` 拿到每镜音频后，把场景时长设为音频时长加短暂停顿。成片允许在 60–120 秒之间自然浮动；不足 60 秒时会给各镜头均匀增加呼吸空间，超过 120 秒则明确报错并要求缩短文案或提高语速。`--duration` 只用于指导 AI 生成新词条，不会把已有手写文案强裁成固定秒数。

结尾两镜的配音仍直接使用词条 `closing` 原文：第一句作为记忆镜头，后续句子作为结尾镜头。画面上不再显示 `Use "word" today` 之类的兜底标题；只有一段主文字的记忆和结尾镜头会居中显示，并省略与主文重复的底部字幕。

## 6. 语音生成逻辑

语音逻辑位于 [voiceAgent.ts](file:///Users/bytedance/ai-video/src/agents/voiceAgent.ts)。

当前 TTS 优先级如下：

1. `ElevenLabs`
2. `Fish Audio`
3. `OpenAI TTS`
4. 本地 `index-tts`
5. macOS `say`

也就是说，只要上游 provider 可用，就会优先使用；失败后会自动回退。

### `index-tts` 相关环境变量

在 [.env.example](file:///Users/bytedance/ai-video/.env.example) 中，当前可用的本地 TTS 相关配置有：

- `INDEX_TTS_ROOT`
- `INDEX_TTS_PYTHON`
- `INDEX_TTS_MODEL_DIR`
- `INDEX_TTS_VOICE`
- `INDEX_TTS_DEVICE`
- `INDEX_TTS_DURATION_FACTOR`

常见用法：

- `INDEX_TTS_VOICE`：指定音色文件或 preset 里的 `prompt.wav`
- `INDEX_TTS_DURATION_FACTOR`：调节语速
  - `1.0`：正常
  - `1.1 / 1.2 / 1.3 / 1.5`：越大越慢

### 已验证过的常见音色路径

- `/Users/bytedance/index-tts/examples/voice_07.wav`
- `/Users/bytedance/index-tts/examples/woman_09.wav`
- `/Users/bytedance/index-tts/examples/woman-11.wav`
- `/Users/bytedance/index-tts/outputs/presets/Bill/prompt.wav`
- `/Users/bytedance/index-tts/outputs/presets/TrumpVoice/prompt.wav`

## 7. 环境准备

### 7.1 安装依赖

```bash
npm install
```

### 7.2 准备 `.env`

复制环境变量模板：

```bash
cp .env.example .env
```

根据需要填写：

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `INDEX_TTS_*`
- 其他你要使用的 provider 配置

如果你主要用本地 `index-tts`，至少需要确认：

- `INDEX_TTS_ROOT` 指向本地 `index-tts`
- `INDEX_TTS_VOICE` 可以找到目标音色文件

## 8. 常用命令

### 本地预览

```bash
npm run dev
```

### 类型检查与 lint

```bash
npm run lint
```

### 通过主管线生成视频

```bash
npm run generate -- <topic> --duration 90 --language en --style vocabulary-cinematic --audience "English learners"
```

示例：

```bash
npm run generate -- accolade --duration 90 --language en --style vocabulary-cinematic --audience "English learners"
```

纯英文版使用 `--language en`，双语版使用 `--language zh`。两种请求会从词库选择各自的 `en` / `bilingual` 词条；片尾 CTA 和 IndexTTS 的 `EN` / `ZH` 模式也会同步切换。

### 使用 `data/input.json` 直接生成

如果 `data/input.json` 已经存在，也可以直接：

```bash
npm run generate
```

### 从词表批量生成

把英文单词逐行写入 `data/words.txt`，然后执行：

```bash
npm run generate:batch -- --file data/words.txt --duration 90
```

成片不会再覆盖 `output/final/<word>.mp4`。默认命名是 `<单词>-<音色>-<语速>-v<版本>.mp4`，例如 `tantrum-bill-1p1x-v1.mp4`。同一组单词、音色和语速再跑一次会自动变成 `v2`。音色来自实际走通的 TTS（`index-tts` 用 `INDEX_TTS_VOICE` 的 preset 名或文件名），语速来自 `INDEX_TTS_DURATION_FACTOR`（未设置时写成 `default`）。

单个单词失败时会记录错误并继续生成后续单词。

## 9. 当前默认输入与限制

输入参数 schema 位于 [input.ts](file:///Users/bytedance/ai-video/src/models/input.ts)。

当前约束：

- `topic`：必填
- `language`：默认 `en`
- `duration`：
  - 最短 `60`
  - 默认 `90`
  - 最长 `120`
- `style`：默认 `modern-tech`
- `audience`：默认 `General`

项目当前实际最常见的使用方式是：

- `topic`: 单词
- `language`: `en`
- `duration`: `90`
- `style`: `vocabulary-cinematic`
- `audience`: `English learners`

## 10. QA 说明

QA 逻辑位于 [qaAgent.ts](file:///Users/bytedance/ai-video/src/agents/qaAgent.ts)。

当前 QA 主要检查：

- `storyboard` schema 是否合法
- 场景时长是否合法
- 场景 narration 是否为空
- 配音文件是否存在
- 背景音乐是否存在
- 字幕是否存在
- 预览帧是否存在
- 最终 MP4 是否存在

QA 还会检查口播是否在不同小节里复述同一层意思。开场、释义、用法和对比里如果出现相同的三词内容片段（例如 hook 和 meaning 都说 `means extremely angry`），脚本阶段会丢掉这次文案并自动重写，最多 3 次。例句段如果再用 “these examples show” 把刚念过的句子总结一遍，同样会触发重写。词库稿本身重复时，会改走 OpenAI 生成新稿。三次仍不通过才停止。配音之后的 QA 只作为兜底。

## 11. 当前项目状态

这份中文版 README 基于当前仓库状态整理，和最初的 Remotion 初始化 README 不同，它已经反映了本项目现在的真实用途：

- 不是一个纯空白的 Remotion 模板
- 而是一个可以批量生成英语单词视频的项目
- 项目里已经包含若干真实生成产物与音色测试路径
- 当前仓库也已经合入了 `storyboard outro` 修复和多模板轮换逻辑

## 12. 常见问题

### 1. 如何添加新单词？

在 `data/words/catalog.json` 添加一个结构化词条即可，不需要修改 TypeScript。纯英文词条使用 `"style": "en"`，双语词条使用 `"style": "bilingual"`；同一个单词可以同时保存两种版本。若配置了 `OPENAI_API_KEY`，缺少的语言版本也可以由单词专用生成器创建脚本。

### 2. 为什么不同音色下时长差很多？

因为：

- `INDEX_TTS_DURATION_FACTOR` 会直接影响节奏
- 不同音色本身说话速度也不同
- 各场景最终时长会根据真实音频长度确定
- 成片可以在 60–120 秒之间自然浮动，不再强制压到 60 秒

### 3. 为什么有时后台命令不怎么刷日志？

最近在一些一次性生成命令里，后台进程存在“继续运行但日志不连续”的现象。遇到这种情况时，通常改成前台重跑更容易确认具体进度。

## 13. 推荐工作方式

如果你要长期继续维护这个项目，推荐按下面的习惯使用：

1. 先确定音色和语速
2. 优先把高频单词加入 `data/words/catalog.json`
3. 用 `npm run generate -- ...` 走标准主管线
4. 只在快速试词时使用一次性脚本方式
5. 提交代码时，尽量把“逻辑修改”和“生成产物”分开提交

## 14. 后续可继续优化的方向

- 优化后台生成日志可见性
- 接入强制对齐服务，获得单词级字幕时间戳
- 增加人工审核后的词条发布流程
