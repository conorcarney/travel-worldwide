export function formatMapFilterStatus(input: {
  rangeLabel: string;
  tags: string[];
}): { dates: string; tags: string } {
  return {
    dates: input.rangeLabel,
    tags: input.tags.join(" · "),
  };
}
