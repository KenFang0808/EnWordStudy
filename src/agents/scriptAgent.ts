import { scriptSchema, type Script } from "../models/script.ts";
import type { VideoRequest } from "../models/input.ts";
import { getEnv } from "../utils/env.ts";
import { countWords, targetWordCount } from "../utils/words.ts";

const parseJsonObject = (text: string): unknown => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Script Agent did not return JSON.");
  }

  return JSON.parse(raw.slice(start, end + 1)) as unknown;
};

const validateScript = (value: unknown, request: VideoRequest): Script => {
  const parsed = scriptSchema.safeParse(value);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Script JSON is invalid: ${details}`);
  }

  if (parsed.data.topic !== request.topic) {
    throw new Error("Script topic does not match the requested topic.");
  }

  const range = targetWordCount(request.duration);
  if (parsed.data.wordCount < range.min) {
    throw new Error(
      `Script is too short for ${request.duration}s (${parsed.data.wordCount} words; need at least ${range.min}).`,
    );
  }

  return parsed.data;
};

const titleCase = (value: string): string =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

type VocabularyPreset = {
  hook: string;
  sections: Array<{
    id: string;
    heading: string;
    narration: string;
    points: string[];
  }>;
  closing: string;
};

const VOCABULARY_PRESETS: Record<string, VocabularyPreset> = {
  lavish: {
    hook:
      'The word "lavish" describes something that is very generous, rich, abundant, or expensive in an impressive way.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Lavish" often describes something given or shown in a very large, generous, or luxurious way. You can use it for praise, like lavish care or lavish praise, but it can also suggest spending or giving more than necessary.',
        points: [
          "Rich, generous, or abundant",
          "Often feels luxurious",
          "Can be positive or excessive",
        ],
      },
      {
        id: "usage",
        heading: "Know how people use it",
        narration:
          'English speakers use "lavish" for money, praise, gifts, attention, meals, and decoration. A lavish hotel looks luxurious. A lavish compliment is very strong. To lavish something on someone means to give it freely and generously.',
        points: [
          "Lavish praise or attention",
          "Lavish gifts or spending",
          "Lavish something on someone",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "The wedding was lavish and beautifully decorated." Another example is, "The coach lavished praise on the team after the win." You can also say, "They live a lavish lifestyle that many people cannot afford."',
        points: [
          "The wedding was lavish.",
          "The coach lavished praise.",
          "They live a lavish lifestyle.",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Lavish" is stronger than generous because it suggests abundance and sometimes luxury. It is also different from expensive, because something can be lavish not only in cost, but also in amount, style, or attention. The verb form often appears in the pattern "lavish something on someone."',
        points: [
          "Stronger than generous",
          "Not only about money",
          "Often used as a verb too",
        ],
      },
    ],
    closing:
      'To remember "lavish," think of something given in a rich, generous, or luxurious way. If praise, gifts, money, or style feel abundant and almost overflowing, they may be lavish.',
  },
  presumptuous: {
    hook:
      'The word "presumptuous" describes someone who acts too confident, too bold, or too familiar without having the right to do so.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Presumptuous" is usually negative. It describes behavior that feels overly bold or disrespectfully confident. If a person speaks or acts as if they have more authority, permission, or closeness than they really have, people may call that presumptuous.',
        points: [
          "Too bold or overconfident",
          "Often feels disrespectful",
          "Goes beyond proper limits",
        ],
      },
      {
        id: "usage",
        heading: "Know when people use it",
        narration:
          'English speakers use "presumptuous" when someone makes an assumption or takes a liberty they should not take. For example, giving strong advice without being asked, acting too familiar with a stranger, or deciding something for other people can seem presumptuous.',
        points: [
          "Assuming too much",
          "Taking unwanted liberties",
          "Acting beyond your place",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "It was presumptuous of him to tell the manager what to do on his first day." Another example is, "I hope this question does not sound presumptuous." You can also say, "She made the presumptuous assumption that everyone agreed with her."',
        points: [
          "It was presumptuous of him.",
          "I hope this is not presumptuous.",
          "She made a presumptuous assumption.",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Presumptuous" is stronger than confident. A confident person may sound sure. A presumptuous person crosses a line. It is also different from rude in general, because "presumptuous" specifically suggests acting as if you already have permission, authority, or closeness when you do not.',
        points: [
          "Stronger than confident",
          "Often crosses a social line",
          "Suggests unearned permission",
        ],
      },
    ],
    closing:
      'To remember "presumptuous," think of someone stepping too far forward without being invited. If a person seems too bold, too familiar, or too sure of their right to act, they may sound presumptuous.',
  },
  squander: {
    hook:
      'The word "squander" means to waste something valuable in a careless or foolish way, especially time, money, or a good opportunity.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Squander" is a strong verb. It does not mean simply use. It means waste badly. When you squander something, you treat something valuable carelessly, and the result feels negative or regretful.',
        points: [
          "Waste in a careless way",
          "Often about money or time",
          "Carries a negative feeling",
        ],
      },
      {
        id: "usage",
        heading: "Know what people squander",
        narration:
          'English speakers often say squander money, squander time, or squander an opportunity. The word fits situations where someone had something valuable but did not use it wisely.',
        points: [
          "Squander money",
          "Squander time",
          "Squander a chance",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "He squandered his savings on things he did not need." Another example is, "Do not squander your weekend scrolling on your phone." You can also say, "The team squandered a great chance to win."',
        points: [
          "He squandered his savings.",
          "Do not squander your weekend.",
          "They squandered a great chance.",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Squander" is stronger than "spend." You can spend money normally, but you squander money badly. It is also stronger than "waste" because it often suggests foolish decisions and lost potential.',
        points: [
          "Stronger than spend",
          "Close to waste, but sharper",
          "Suggests regret and bad judgment",
        ],
      },
    ],
    closing:
      'To remember "squander," think of wasting something valuable and later regretting it. If you squander time, money, or opportunity, you lose something that mattered.',
  },
};

const isSingleWordTopic = (topic: string): boolean => /^[a-zA-Z-]+$/.test(topic.trim());

const buildVocabularyScript = (request: VideoRequest): Script | null => {
  if (!isSingleWordTopic(request.topic)) {
    return null;
  }

  const preset = VOCABULARY_PRESETS[request.topic.trim().toLowerCase()];
  if (!preset) {
    return null;
  }

  let extra = "";
  const assembled = () =>
    [
      preset.hook,
      ...preset.sections.map((section) => section.narration),
      extra,
      preset.closing,
    ]
      .filter(Boolean)
      .join(" ");

  const range = targetWordCount(request.duration);
  while (countWords(assembled()) < range.min) {
    extra +=
      ' Say the word aloud, notice the negative tone, and connect it to real situations where someone wastes something important.';
  }

  const narration = assembled();
  return {
    topic: request.topic,
    language: request.language,
    audience: request.audience,
    targetDurationSeconds: request.duration,
    hook: preset.hook,
    sections: preset.sections,
    closing: preset.closing,
    wordCount: countWords(narration),
  };
};

const buildGenericScript = (request: VideoRequest): Script => {
  const topicLabel = titleCase(request.topic);
  const hook = `${topicLabel} is not about sounding perfect. For ${request.audience}, it is about being clear, confident, and memorable so the audience follows your message from the first sentence.`;
  const sections = [
    {
      id: "foundation",
      heading: "Start with a clear message",
      narration: `Strong ${request.topic} starts with one clear message. Before you think about vocabulary or gestures, decide the single idea you want people to remember when you finish speaking.`,
      points: [
        "Choose one takeaway",
        "State it in simple words",
        "Repeat the main idea clearly",
      ],
    },
    {
      id: "structure",
      heading: "Use a simple structure",
      narration: `A simple structure makes ${request.topic} easier to follow. Open with a hook, move through two or three supporting points, and close with a short summary or call to action.`,
      points: ["Hook", "Two or three points", "Clear ending"],
    },
    {
      id: "delivery",
      heading: "Control pace and presence",
      narration: `Delivery matters because listeners judge confidence through sound and presence. Speak a little slower than normal conversation, pause between ideas, and let your posture support your words.`,
      points: [
        "Speak at a steady pace",
        "Pause for emphasis",
        "Use eye contact and open posture",
      ],
    },
    {
      id: "practice",
      heading: "Practice for real improvement",
      narration: `${request.audience} improve fastest when practice is specific. Record short talks, listen for weak transitions or unclear pronunciation, and revise one thing at a time instead of trying to fix everything at once.`,
      points: [
        "Record and review",
        "Fix one weakness each round",
        "Practice with real topics",
      ],
    },
  ];
  const closing = `Great ${request.topic} grows through repetition, not perfection. Start with short speeches, focus on clarity and connection, and let each talk build more confidence for the next one.`;

  let extra = "";
  const assembled = () =>
    [hook, ...sections.map((section) => section.narration), extra, closing]
      .filter(Boolean)
      .join(" ");

  const range = targetWordCount(request.duration);
  while (countWords(assembled()) < range.min) {
    extra +=
      " Keep the language simple, make each point concrete, and give the audience a moment to absorb what you just said.";
  }

  const narration = assembled();
  return {
    topic: request.topic,
    language: request.language,
    audience: request.audience,
    targetDurationSeconds: request.duration,
    hook,
    sections,
    closing,
    wordCount: countWords(narration),
  };
};

const buildPublicSpeakingScript = (request: VideoRequest): Script => {
  const audience = request.audience;
  const hook =
    "Good English public speaking is not about difficult words. It is about helping people understand you, trust you, and remember your main point.";
  const sections = [
    {
      id: "message",
      heading: "Lead with one message",
      narration:
        "Start with one takeaway. If people can repeat your message in one sentence, your speech is clear. Many speakers lose impact by adding too many ideas.",
      points: [
        "Choose one core idea",
        "Cut extra details",
        "Make the point easy to repeat",
      ],
    },
    {
      id: "structure",
      heading: "Use a simple speaking frame",
      narration:
        "Use a simple frame: hook, two or three points, and a short ending. This structure helps listeners stay with you even when your English is not perfect.",
      points: ["Hook", "Two or three points", "Short summary"],
    },
    {
      id: "delivery",
      heading: "Sound calm and natural",
      narration:
        "Speak a little slower than normal conversation. Stress key words and pause after important ideas. A calm pace sounds more confident than fast speech.",
      points: [
        "Slow down a little",
        "Stress key words",
        "Pause after key ideas",
      ],
    },
    {
      id: "practice",
      heading: "Practice like a real speaker",
      narration: `${audience} improve faster with realistic practice. Record one minute talks, check your opening and transitions, then improve one habit at a time.`,
      points: [
        "Record one minute talks",
        "Review openings and transitions",
        "Improve one habit each round",
      ],
    },
  ];
  const closing =
    "To improve English public speaking, focus on clarity, structure, and calm delivery. You do not need perfect English. You need a message people can follow.";

  let extra = "";
  const assembled = () =>
    [hook, ...sections.map((section) => section.narration), extra, closing]
      .filter(Boolean)
      .join(" ");

  const range = targetWordCount(request.duration);
  while (countWords(assembled()) < range.min) {
    extra +=
      " Keep your examples concrete, keep your sentences short, and finish with a line your audience can remember.";
  }

  const narration = assembled();
  return {
    topic: request.topic,
    language: request.language,
    audience: request.audience,
    targetDurationSeconds: request.duration,
    hook,
    sections,
    closing,
    wordCount: countWords(narration),
  };
};

const buildLocalScript = (request: VideoRequest): Script => {
  const vocabularyScript = buildVocabularyScript(request);
  if (vocabularyScript) {
    return vocabularyScript;
  }

  if (/public speaking|presentation|speech|communication/i.test(request.topic)) {
    return buildPublicSpeakingScript(request);
  }

  return buildGenericScript(request);
};

const generateWithOpenAI = async (request: VideoRequest): Promise<Script> => {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const range = targetWordCount(request.duration);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You write voice-over scripts for short explainer videos. Return JSON only.",
        },
        {
          role: "user",
          content: `Create a spoken narration script as JSON with keys: topic, language, audience, targetDurationSeconds, hook, sections (array of {id, heading, narration, points}), closing, wordCount. Topic: ${request.topic}. Language: ${request.language}. Audience: ${request.audience}. Target duration: ${request.duration} seconds. Use a strong hook, natural spoken ${request.language}, short sentences, and ${range.min}-${range.max} words. Include 4 sections. Each section needs 3 short points.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI script generation failed (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty script.");
  }

  return validateScript(parseJsonObject(content), request);
};

export const generateScript = async (request: VideoRequest): Promise<Script> => {
  if (getEnv("OPENAI_API_KEY")) {
    console.log("Script Agent: using OpenAI");
    return generateWithOpenAI(request);
  }

  console.log(
    "Script Agent: OPENAI_API_KEY is not set. Using the local script provider.",
  );
  return validateScript(buildLocalScript(request), request);
};
