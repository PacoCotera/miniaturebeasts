// The journey step of the sitting's door on a save, PENDING until sitting.mjs openSittingDoor is wired into the host (today dev.mjs only sets st.doorAt). The face's door opened in S3 and
// journey-sitting.json walks the screen; this step runs when a save can open the door, and is then re-pointed at the face by keys and intents.
export const milestone = "the sitting's door on a save (sitting.mjs openSittingDoor wired into the host; today dev.mjs only)";
export const steps = [
  { id: "sitting-door-owed", what: "the first load with the sitting's door open, on a save carrying a held welcome and one earned moment: the welcome held, one owed (X21)" },
]
