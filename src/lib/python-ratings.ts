// The existing API/SQL and backups use 0–4. Keep that contract stable while
// presenting the same five rubric bands as 1–5 in every teacher/student view.
export const pythonRatingBands = [
  "Not yet demonstrated",
  "Beginning",
  "Partly demonstrated",
  "Mostly demonstrated",
  "Clearly demonstrated",
] as const;

export function displayedPythonRating(stored: number): number {
  if (!Number.isInteger(stored) || stored < 0 || stored > 4) {
    throw Error("Invalid saved Python rating.");
  }
  return stored + 1;
}

export function storedPythonRating(displayed: number): number {
  if (!Number.isInteger(displayed) || displayed < 1 || displayed > 5) {
    throw Error("Choose a rating from 1 to 5 for each criterion.");
  }
  return displayed - 1;
}

export const pythonRatingCriteria = [
  { key: "logic", label: "Programming logic", description: "Plans a sensible sequence and uses decisions or repetition appropriately." },
  { key: "application", label: "Applying the concept", description: "Uses the lesson's programming concept to solve the activity." },
  { key: "correctness", label: "Correctness", description: "Handles the required inputs and produces the requested results." },
] as const;
