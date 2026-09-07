# EnWordStudy

基于 Remotion、React 和 TypeScript 的英语单词讲解视频生成器。

这个项目可以把 `lavish`、`presumptuous`、`squander` 这类英文单词自动生成竖屏短视频，包含：

- 单词讲解脚本
- 分镜 storyboard
- AI 配音
- 字幕
- 背景音乐
- 最终 `1080x1920` 成片

## 当前项目状态

这个仓库已经不是默认的 Remotion 模板，而是一套可运行的英语词汇视频生成流水线。

当前已具备的能力：

- 竖屏输出：`1080x1920`
- 帧率：`30fps`
- 默认受众：英语学习者
- 单词讲解模式的本地模板生成
- 场景系统：`intro`、`content`、`diagram`、`list`、`quote`、`outro`
- 字幕叠加
- 背景音乐生成
- 多级 TTS provider 回退机制

## 快速开始

安装依赖：

```bash
npm install
```

复制环境变量模板：

```bash
cp .env.example .env
```

启动 Remotion Studio 预览：

```bash
npm run dev
```

生成一个完整的单词讲解视频：

```bash
npm run generate -- lavish --duration 60 --style vocabulary-cinematic --audience "English learners" --language en
```

如果只是基于当前 `storyboard` 重新渲染成片：

```bash
npx remotion render src/index.ts AIVideo output/final/lavish.mp4 --overwrite
```

运行检查：

```bash
npm run lint
```

## 生成流水线

主流程入口在 `src/pipeline/generateVideo.ts`，执行顺序如下：

1. 校验输入参数
2. 生成脚本
3. 生成分镜 storyboard
4. 补充视觉元数据
5. 生成配音
6. 生成背景音乐
7. 生成字幕
8. 输出预览帧
9. 执行 QA 校验
10. 渲染最终视频

生成过程中会产出这些文件：

- `data/input.json`
- `data/script.json`
- `data/storyboard.json`
- `public/audio/voice`
- `public/audio/music`
- `output/previews`
- `output/final`

## 目录结构

```text
src/
  agents/        脚本、分镜、配音、音乐、字幕、QA
  models/        Zod schema 与共享类型
  pipeline/      主生成入口
  remotion/      视频组合、场景、动画、组件
  utils/         路径、时长、环境变量、JSON 写入等工具
data/            最近一次生成的输入、脚本、分镜快照
public/audio/    生成出来的配音和背景音乐
output/          预览图与最终成片
```

## TTS 配音优先级

配音生成会按下面顺序依次尝试：

1. ElevenLabs
2. OpenAI TTS
3. 本地 `index-tts`
4. macOS `say`

`.env.example` 中已经列出了常用配置项：

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `OPENAI_API_KEY`
- `INDEX_TTS_ROOT`
- `INDEX_TTS_VOICE`
- `INDEX_TTS_DEVICE`

如果同时设置了 `ELEVENLABS_API_KEY` 和 `ELEVENLABS_VOICE_ID`，会优先使用 ElevenLabs。

## 当前内置单词模板

当前本地词汇模板已经支持以下单词：

- `lavish`
- `presumptuous`
- `squander`

这些模板定义在 `src/agents/scriptAgent.ts` 的 `VOCABULARY_PRESETS` 中。

如果你想新增一个单词并使用更定制化的脚本，可以直接往 `VOCABULARY_PRESETS` 里加一项。

## 重要说明

- 你传入的 `duration` 是目标时长，不是绝对上限；如果 TTS 音频更长，最终成片时长会被拉长。
- 首屏 `intro` 已经调整成首帧直接显示单词，不会先黑一下再出现内容。
- `outro` 结尾时长已经改成更贴合语音，而不是固定长时间停留。
- `.env` 会被 Git 忽略，`.env.example` 会保留在仓库中。
- `output/` 下的 `mp4` 和预览图默认不会提交到 Git。

## 示例命令

生成 `presumptuous`：

```bash
npm run generate -- presumptuous --duration 60 --style vocabulary-cinematic --audience "English learners" --language en
```

启动本地预览：

```bash
npm run dev
```

基于最近一次生成结果重新导出视频：

```bash
npx remotion render src/index.ts AIVideo output/final/latest.mp4 --overwrite
```

## 技术栈

- Remotion
- React 19
- TypeScript
- Zod
- ESLint
- ffmpeg / ffprobe
- ElevenLabs / OpenAI / index-tts / macOS say

## 仓库地址

GitHub：

- <https://github.com/KenFang0808/EnWordStudy>
