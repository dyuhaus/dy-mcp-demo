import { useState } from "react";
import { Dashboard } from "./screens/Dashboard";
import { Styles } from "./screens/Styles";
import { Projects } from "./screens/Projects";
import { Prefs } from "./screens/Prefs";
import { Add } from "./screens/Add";
import { JsonView } from "./screens/JsonView";
import { Activity } from "./screens/Activity";
import { Tools } from "./screens/Tools";
import { Shell, type ScreenKey } from "./components/Shell";

export function App(): JSX.Element {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");

  const body = (() => {
    switch (screen) {
      case "dashboard":
        return <Dashboard />;
      case "styles":
        return <Styles />;
      case "projects":
        return <Projects />;
      case "prefs":
        return <Prefs />;
      case "add":
        return <Add onDone={() => setScreen("dashboard")} />;
      case "json":
        return <JsonView />;
      case "activity":
        return <Activity />;
      case "tools":
        return <Tools />;
    }
  })();

  return (
    <Shell screen={screen} setScreen={setScreen}>
      {body}
    </Shell>
  );
}
