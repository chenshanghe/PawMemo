export interface WritingStyle {
  name: string;
  emoji: string;
  prompt: string;
}

export const WRITING_STYLES: WritingStyle[] = [
  {
    name: "纪实流水账",
    emoji: "📋",
    prompt: "按时间顺序记录，补充行程细节，语言简洁客观，还原真实经过，不过度抒情",
  },
  {
    name: "散文抒情",
    emoji: "🌸",
    prompt: "加入景物描写与内心感受，多用比喻和意象，句式错落有致，追求诗意意境",
  },
  {
    name: "人文探寻",
    emoji: "🏛️",
    prompt: "融入历史文化背景和当地风俗典故，语言严谨而有温度，带有思考与探索感",
  },
  {
    name: "小红书风",
    emoji: "📱",
    prompt: "短段落快节奏，口语化表达，多用感叹，突出亮点和种草点，轻松活泼有感染力",
  },
  {
    name: "故事化叙述",
    emoji: "📖",
    prompt: "引入人物对话或情节转折，设置悬念或情绪高潮，读起来像故事而非流水账",
  },
  {
    name: "攻略实用风",
    emoji: "🗺️",
    prompt: "结构化输出，去除主观感受，语言精准简练，突出景点、餐厅、交通等实用信息",
  },
];
