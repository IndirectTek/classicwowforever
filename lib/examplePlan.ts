import type { PlanView } from "./schema";

export const EXAMPLE_SHARE_ID = "example";

// A hand-written sample for the home page and /p/example. It names places but
// no specific quests, like a real plan does when quest data is thin.
export const examplePlan: PlanView = {
  shareId: EXAMPLE_SHARE_ID,
  characterName: "Aldric",
  characterClass: "warrior",
  characterLevel: 7,
  minutes: 75,
  goal: "xp",
  plan: {
    summary:
      "A steady questing hour around Goldshire: finish what's in your log, then log out rested.",
    steps: [
      {
        action: "Turn in finished quests in Goldshire and pick up anything new",
        minutes: 8,
        quests: [],
      },
      {
        action: "Work through your open quests in the farmland south of town",
        minutes: 25,
        quests: [],
      },
      {
        action: "Grind mobs near your level on the road east while you finish up",
        minutes: 15,
        quests: [],
      },
      {
        action: "Head back to Goldshire, turn everything in, and train new skills",
        minutes: 12,
        quests: [],
      },
      { action: "Sell your bags and set your hearthstone at the inn", minutes: 6, quests: [] },
    ],
    logoutSpot: { id: "goldshire-inn", name: "Lion's Pride Inn, Goldshire" },
    why: "Everything stays within a short run of town, so your 75 minutes go to XP instead of travel.",
  },
};
