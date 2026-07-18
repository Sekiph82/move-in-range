import { MedicalSafetyPolicyEngine, conditionPolicies } from "@moveinrange/health-rules";

const roles = ["super_admin", "clinical_reviewer", "exercise_reviewer", "content_editor", "support", "analyst"];

export default function AdminHome() {
  const policyCount = conditionPolicies.length;
  return (
    <div className="shell">
      <nav className="nav" aria-label="Admin navigation">
        <h1>MoveInRange</h1>
        {["Policies", "Exercise Review", "Simulator", "Audit Logs", "Import Jobs", "Feature Flags"].map((item) => <a key={item} href={"#" + item}>{item}</a>)}
      </nav>
      <main className="main">
        <h2>Administration</h2>
        <p>Draft clinical policy and exercise safety review workspace. Published policy changes require authorized clinical review.</p>
        <section className="grid">
          <article className="card"><h3>Roles</h3><p>{roles.join(", ")}</p></article>
          <article className="card"><h3>Policies</h3><p>{policyCount} draft rules in versioned configuration.</p></article>
          <article className="card"><h3>Simulator</h3><PolicySimulator /></article>
          <article className="card"><h3>Safety Boundary</h3><p>No insulin dose calculation, medication recommendation, diagnosis, or clinician-plan override.</p></article>
        </section>
      </main>
    </div>
  );
}

function PolicySimulator() {
  const decision = new MedicalSafetyPolicyEngine().evaluate({
    userId: "synthetic",
    preferredName: "Synthetic",
    units: "metric",
    country: "US",
    timezone: "America/New_York",
    language: "en",
    conditions: ["cardiac_rehabilitation_support"],
    clinicianRestrictions: [],
    sensitivities: {},
    equipment: ["body weight"],
    environment: "home",
    activityLevel: "beginner",
    preferredTrainingDays: ["Mon"],
    dailyAvailableMinutes: 10,
    goals: ["mobility"],
    medicalClearance: "clinician_supervised",
    consentAccepted: true
  }, {
    energy: 3,
    sleepQuality: 3,
    pain: 1,
    newInjury: false,
    dizziness: false,
    chestDiscomfort: false,
    unusualShortnessOfBreath: false,
    illness: false,
    recentFall: false,
    availableMinutes: 10,
    desiredSessionType: "mobility",
    stress: 1
  });
  return <pre>{JSON.stringify({ action: decision.action, triggeredRules: decision.triggeredRuleIds }, null, 2)}</pre>;
}
