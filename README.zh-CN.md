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

- 单词词库预设
- 本地 `index-tts` 音色接入
- ElevenLabs / Fish Audio / OpenAI / `index-tts` 的 TTS 回退链路
- `quote / outro` 收尾逻辑修复
- 单句 `closing` 时的多模板 `outro` 轮换

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
4. 应用视觉样式
5. 生成配音
6. 生成背景音乐
7. 生成字幕
8. 渲染 QA 预览帧
9. 执行 QA 检查
10. 渲染最终视频到 `output/final`

## 3. 项目结构

核心目录约定在 [assets.ts](file:///Users/bytedance/ai-video/src/utils/assets.ts)：

- `data/input.json`：本次生成请求
- `data/script.json`：脚本文案
- `data/storyboard.json`：分镜数据
- `public/audio/voice/`：各场景配音
- `public/audio/music/`：背景音乐
- `public/images/generated/`：自动生成图片
- `output/previews/`：预览帧和中间预览产物
- `output/final/`：最终 MP4 成片

主要代码目录：

- `src/pipeline/`：主生成管线
- `src/agents/`：各个 Agent
- `src/remotion/`：Remotion 场景与组件
- `src/models/`：数据结构与 schema
- `src/utils/`：工具函数和路径管理

## 4. 脚本生成逻辑

脚本生成入口在 [scriptAgent.ts](file:///Users/bytedance/ai-video/src/agents/scriptAgent.ts)。

当前逻辑分为三层：

1. 如果设置了 `OPENAI_API_KEY`
   - 优先走 OpenAI 生成脚本
2. 如果没有 OpenAI
   - 优先尝试本地单词预设 `VOCABULARY_PRESETS`
3. 如果既不是预设词，也不是特殊主题
   - 回退到本地通用脚本模板

当前本地脚本提供器包含：

- `VOCABULARY_PRESETS`
  - 适合固定质量、固定结构的单词讲解视频
- `buildPublicSpeakingScript()`
  - 适合 `public speaking / presentation / speech / communication`
- `buildGenericScript()`
  - 通用主题脚本模板

注意：

- 想要稳定、高质量的“单词讲解风格”，最适合加入 `VOCABULARY_PRESETS`
- 如果不在预设词库里，也可以临时通过一次性脚本方式生成，但那不属于主逻辑的一部分

## 5. 分镜与收尾逻辑

分镜逻辑位于 [storyboardAgent.ts](file:///Users/bytedance/ai-video/src/agents/storyboardAgent.ts)。

当前固定场景规划为：

- `intro`
- `definition`
- `loop`
- `traits`
- `audience`
- `quote`
- `outro`

最近已修复的问题：

- 当 `closing` 只有一句时，过去 `quote` 和 `outro` 会重复
- 现在规则变为：
  - `quote` 使用 `closing` 第一句
  - `outro` 如果还有剩余句子，则使用剩余句子
  - 如果没有剩余句子，则使用多模板轮换的兜底 `outro`

这意味着：

- 不会再出现结尾两段一模一样的问题
- 不同单词的收尾会更自然
- 同一个单词重复生成时，兜底模板仍然保持稳定可复现

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
npm run generate -- <topic> --duration 60 --language en --style vocabulary-cinematic --audience "English learners"
```

示例：

```bash
npm run generate -- accolade --duration 60 --language en --style vocabulary-cinematic --audience "English learners"
```

### 使用 `data/input.json` 直接生成

如果 `data/input.json` 已经存在，也可以直接：

```bash
npm run generate
```

## 9. 当前默认输入与限制

输入参数 schema 位于 [input.ts](file:///Users/bytedance/ai-video/src/models/input.ts)。

当前约束：

- `topic`：必填
- `language`：默认 `en`
- `duration`：
  - 最短 `60`
  - 默认 `90`
  - 最长 `180`
- `style`：默认 `modern-tech`
- `audience`：默认 `General`

项目当前实际最常见的使用方式是：

- `topic`: 单词
- `language`: `en`
- `duration`: `60`
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

当前 QA 更偏向“结构完整性检查”，还不是“文案质量检查器”。

例如：

- 它能发现文件缺失
- 它能发现 narration 为空
- 但它不会自动判断一段文案是不是表达太重复，除非规则被显式加入

## 11. 当前项目状态

这份中文版 README 基于当前仓库状态整理，和最初的 Remotion 初始化 README 不同，它已经反映了本项目现在的真实用途：

- 不是一个纯空白的 Remotion 模板
- 而是一个可以批量生成英语单词视频的项目
- 项目里已经包含若干真实生成产物与音色测试路径
- 当前仓库也已经合入了 `storyboard outro` 修复和多模板轮换逻辑

## 12. 常见问题

### 1. 为什么有些新单词需要改 `scriptAgent.ts`？

因为高质量、固定结构的单词视频目前主要来自 `VOCABULARY_PRESETS`。如果一个新词不在预设里，主逻辑通常会回退到通用脚本。

### 2. 为什么不同音色下时长差很多？

因为：

- `INDEX_TTS_DURATION_FACTOR` 会直接影响节奏
- 不同音色本身说话速度也不同
- 各场景最终时长会根据真实音频长度重新拉长

### 3. 为什么有时后台命令不怎么刷日志？

最近在一些一次性生成命令里，后台进程存在“继续运行但日志不连续”的现象。遇到这种情况时，通常改成前台重跑更容易确认具体进度。

## 13. 推荐工作方式

如果你要长期继续维护这个项目，推荐按下面的习惯使用：

1. 先确定音色和语速
2. 优先把高频单词加入 `VOCABULARY_PRESETS`
3. 用 `npm run generate -- ...` 走标准主管线
4. 只在快速试词时使用一次性脚本方式
5. 提交代码时，尽量把“逻辑修改”和“生成产物”分开提交

## 14. 后续可继续优化的方向

- 把词汇预设从 `scriptAgent.ts` 中拆到独立词库文件
- 给 QA 增加 narration 重复检测
- 给视频生成加批量任务入口
- 优化后台生成日志可见性
- 为不同视频风格提供不同的脚本模板和收尾模板
