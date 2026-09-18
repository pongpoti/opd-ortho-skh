export type AppModule = {
  slug: string;
  name: string;
  description: string;
  href: string;
};

export const modules: AppModule[] = [
  {
    slug: "waiting-time",
    name: "Waiting Time",
    description: "Average OPD patient waiting time from monthly CSV exports.",
    href: "/waiting-time",
  },
];
