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
  equanimity: {
    hook:
      'The word "equanimity" describes calmness, emotional balance, and mental steadiness, especially in a difficult or stressful situation.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Equanimity" is a formal word for staying calm and balanced under pressure. It does not mean feeling nothing. It means keeping your mind steady instead of becoming overly upset, anxious, or reactive when something difficult happens.',
        points: [
          "Calm and balanced",
          "Especially under pressure",
          "Suggests emotional steadiness",
        ],
      },
      {
        id: "usage",
        heading: "Know how people use it",
        narration:
          'English speakers use "equanimity" in serious or thoughtful contexts, such as leadership, mindfulness, crisis, and personal growth. You may hear phrases like face criticism with equanimity or maintain equanimity in a crisis when someone stays composed instead of panicking.',
        points: [
          "Face stress with equanimity",
          "Maintain equanimity in a crisis",
          "Often used in thoughtful or formal contexts",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "She handled the unexpected news with remarkable equanimity." Another example is, "A good leader responds to pressure with equanimity." You can also say, "Meditation helped him develop more equanimity in daily life."',
        points: [
          "She showed remarkable equanimity",
          "A leader responds with equanimity",
          "Meditation built equanimity",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Equanimity" is stronger and more formal than calm. Calm can describe a momentary feeling, but equanimity suggests a deeper, more stable emotional balance. It is also different from indifference, because a person with equanimity still cares, but stays steady.',
        points: [
          "More formal than calm",
          "Deeper than a temporary mood",
          "Not the same as indifference",
        ],
      },
    ],
    closing:
      'To remember "equanimity," think of a steady mind in a difficult moment. If someone stays calm, balanced, and emotionally grounded under pressure, they may be showing equanimity.',
  },
  vicious: {
    hook:
      'The word "vicious" describes something or someone that is cruel, violent, dangerously severe, or intensely harmful.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Vicious" is a strong negative word. It can describe a person or animal that is physically aggressive, but it can also describe something harmful or extreme, such as a vicious attack, a vicious rumor, or a vicious cycle that keeps causing damage.',
        points: [
          "Cruel, violent, or aggressive",
          "Can describe harm, not just people",
          "Very strong negative tone",
        ],
      },
      {
        id: "usage",
        heading: "Know how people use it",
        narration:
          'English speakers use "vicious" for attacks, comments, competition, circles of harm, and difficult patterns. You may hear phrases like a vicious dog, a vicious argument online, or a vicious cycle of stress and poor sleep.',
        points: [
          "A vicious dog or attack",
          "Vicious comments or criticism",
          "A vicious cycle",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "The article received vicious criticism online." Another example is, "They were trapped in a vicious cycle of debt and anxiety." You can also say, "The injured animal became vicious when people tried to approach it."',
        points: [
          "Vicious criticism online",
          "A vicious cycle of debt",
          "The animal became vicious",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Vicious" is stronger than mean or harsh. A mean comment may be unpleasant, but a vicious comment feels deliberately cruel or deeply damaging. It is also different from violent alone, because "vicious" often adds the sense of cruelty, intensity, or destructive force.',
        points: [
          "Stronger than mean",
          "Often implies cruelty",
          "Can describe emotional or social harm too",
        ],
      },
    ],
    closing:
      'To remember "vicious," think of something harsh and harmful in an intense way. If behavior, language, or a pattern feels cruel, aggressive, or seriously damaging, it may be vicious.',
  },
  perceptible: {
    hook:
      'The word "perceptible" describes something that is noticeable or able to be sensed, even if the change or effect is small.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Perceptible" means able to be perceived by the senses or mind. Something perceptible is noticeable enough to detect, even if it is slight. It often appears when a difference, change, sound, or effect is small but still real.',
        points: [
          "Able to be noticed",
          "Often small but detectable",
          "Can describe physical or mental perception",
        ],
      },
      {
        id: "usage",
        heading: "Know how people use it",
        narration:
          'English speakers use "perceptible" for small changes in sound, temperature, emotion, quality, or progress. You may hear phrases like a perceptible difference, a perceptible pause, or a perceptible improvement when something is not dramatic but can still be sensed.',
        points: [
          "A perceptible difference",
          "A perceptible pause or shift",
          "A perceptible improvement",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "There was a perceptible drop in temperature after sunset." Another example is, "Her voice showed a perceptible note of disappointment." You can also say, "The new design brought a perceptible improvement in readability."',
        points: [
          "A perceptible drop in temperature",
          "A perceptible note of disappointment",
          "A perceptible improvement in readability",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Perceptible" is close to noticeable, but it often sounds a bit more formal and can suggest a subtle effect. It is the opposite of imperceptible, which means too slight to notice. So if a change is small but still detectable, perceptible is a strong choice.',
        points: [
          "Close to noticeable, but more formal",
          "Opposite of imperceptible",
          "Good for subtle but real changes",
        ],
      },
    ],
    closing:
      'To remember "perceptible," think of something small but still clear enough to notice. If a change, feeling, or effect can be sensed at all, it may be perceptible.',
  },
  unscrupulous: {
    hook:
      'The word "unscrupulous" describes a person or action that has no moral principles and does not care about what is fair, honest, or right.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Unscrupulous" is strongly negative. It describes someone who is willing to lie, cheat, manipulate, or harm others in order to get an advantage. If a person has no real concern for ethics, people may call them unscrupulous.',
        points: [
          "Lacks moral principles",
          "Willing to cheat or deceive",
          "Clearly negative in tone",
        ],
      },
      {
        id: "usage",
        heading: "Know when people use it",
        narration:
          'English speakers often use "unscrupulous" for business people, politicians, sellers, or companies that act dishonestly. You may hear phrases like unscrupulous tactics, unscrupulous behavior, or unscrupulous operators when someone crosses ethical lines for profit or power.',
        points: [
          "Unscrupulous tactics",
          "Unscrupulous business practices",
          "Profit or power without ethics",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "The company used unscrupulous marketing tricks to mislead customers." Another example is, "He is an unscrupulous dealer who takes advantage of inexperienced buyers." You can also say, "Unscrupulous landlords may ignore safety problems to save money."',
        points: [
          "Unscrupulous marketing tricks",
          "An unscrupulous dealer",
          "Unscrupulous landlords ignore safety",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Unscrupulous" is stronger than selfish or aggressive. A selfish person thinks mainly about themselves, but an unscrupulous person may ignore honesty and fairness completely. It is close to dishonest, but "unscrupulous" especially emphasizes a lack of moral limits.',
        points: [
          "Stronger than selfish",
          "Close to dishonest, but harsher",
          "Highlights no moral limits",
        ],
      },
    ],
    closing:
      'To remember "unscrupulous," think of someone who will do almost anything to win or profit, even if it is unfair or wrong. If ethics do not seem to matter at all, that behavior may be unscrupulous.',
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
  capricious: {
    hook:
      'The word "capricious" describes someone or something that changes suddenly and unpredictably, often without a clear reason.',
    sections: [
      {
        id: "meaning",
        heading: "Understand the meaning",
        narration:
          '"Capricious" is usually used when behavior, decisions, or changes feel random and hard to predict. A capricious person may change moods or opinions quickly. A capricious system or situation may shift suddenly without consistency or logic.',
        points: [
          "Unpredictable and changeable",
          "Often shifts without clear reason",
          "Can describe people or situations",
        ],
      },
      {
        id: "usage",
        heading: "Know how people use it",
        narration:
          'English speakers often use "capricious" in formal or thoughtful contexts, especially for leaders, decisions, weather, markets, or rules that seem unstable. You may hear phrases like capricious behavior, a capricious mood, or capricious decisions when things feel inconsistent and difficult to trust.',
        points: [
          "Capricious behavior or moods",
          "Capricious decisions or rules",
          "Often used in formal contexts",
        ],
      },
      {
        id: "examples",
        heading: "Learn it through examples",
        narration:
          'For example, "The manager seemed capricious and changed priorities every day." Another example is, "Investors grew nervous in the face of capricious market swings." You can also say, "The child made capricious choices, wanting one thing and then rejecting it minutes later."',
        points: [
          "A capricious manager",
          "Capricious market swings",
          "Capricious choices from a child",
        ],
      },
      {
        id: "contrast",
        heading: "Avoid common confusion",
        narration:
          '"Capricious" is stronger than flexible or spontaneous. Flexible can be positive, but capricious suggests instability and a lack of reliable judgment. It is also different from impulsive, because impulsive focuses on acting quickly, while capricious emphasizes unpredictable change over time.',
        points: [
          "Less positive than flexible",
          "Different from impulsive",
          "Suggests instability, not creativity",
        ],
      },
    ],
    closing:
      'To remember "capricious," think of sudden changes that are hard to explain or trust. If a person, mood, or system keeps shifting unpredictably, it may be capricious.',
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
