export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export interface BrandValue {
  ja: string;
  en: string;
  icon: string;
}

export const brandStory = {
  tagline: "最高の品質で、世界のブランドへ",
  catchCopy:
    "AJAZZ は 2009 年の創業以来、「こだわり」と「革新」を原動力に、世界中のゲーマーに愛される製品を創り続けています。",
  timeline: [
    {
      year: "2009",
      title: "創業 — こだわりの始まり",
      description:
        "中国・深圳で創業。ゲーマーが欲しいものを自ら作る、その想いがすべての始まりでした。",
    },
    {
      year: "2010",
      title: "初代メカニカルキーボード誕生",
      description:
        "国産初のメカニカルキーボードをリリース。ゲーミングギア市場に新たな風を吹き込みました。",
    },
    {
      year: "2014",
      title: "eスポーツシーンに参入",
      description:
        "プロチームとのスポンサー契約を皮切りに、本格的に eスポーツ業界へ。カスタム外設の提供を開始。",
    },
    {
      year: "2016",
      title: "大手プラットフォームと連携",
      description:
        "Ali Pictures との協業を開始。ゲームとエンターテインメントの融合を加速させました。",
    },
    {
      year: "2020",
      title: "海外クラウドファンディング成功",
      description:
        "日本・韓国・東南アジア市場へ本格進出。クラウドファンディングで世界的な支持を獲得しました。",
    },
    {
      year: "2021",
      title: "カスタムスイッチの世界へ",
      description:
        "自社開発スイッチ「Fresh Fruit」シリーズを発表。カスタムキーボードカルチャーに新たな選択肢を提供。",
    },
    {
      year: "2022",
      title: "グローバルブランドへの挑戦",
      description:
        "「Cheese」キーボードのヒットを機に、世界 30 カ国以上で展開中。日本市場にも本格参入。",
    },
  ] satisfies TimelineEvent[],

  values: [
    { ja: "責任感", en: "Responsibility", icon: "🎯" },
    { ja: "革新", en: "Innovation", icon: "💡" },
    { ja: "効率", en: "Efficiency", icon: "⚡" },
    { ja: "チームワーク", en: "Teamwork", icon: "🤝" },
    { ja: "共有", en: "Sharing", icon: "🔄" },
    { ja: "実績", en: "Achievement", icon: "🏆" },
  ] satisfies BrandValue[],
};
