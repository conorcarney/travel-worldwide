export const STATISTICS_SLIDES = [
  {
    id: "overall",
    label: "Overall",
    imageSrc: "/stats/overall.jpg",
    imageAlt: "Aerial view of the earth from above the clouds",
  },
  {
    id: "passat",
    label: "Passat Roadtrip",
    imageSrc: "/stats/passat.jpg",
    imageAlt: "A travel car on a mountain highway at dusk",
  },
  {
    id: "ratings",
    label: "Country Ratings",
    imageSrc: "/stats/ratings.jpg",
    imageAlt: "Coastal town and hillside at sunset",
  },
] as const;

export type StatisticsSlideId = (typeof STATISTICS_SLIDES)[number]["id"];
