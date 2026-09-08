import React from "react";
import { Composition } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifKR";
import { Narration } from "./Narration";
import { MODULES } from "./generated/modules";
import { buildTimeline, FPS } from "./lib/timeline";
import "./app.css";
import "./video.css";

loadSans("normal", { weights: ["400", "500", "700"] });
loadSerif("normal", { weights: ["400", "600"] });

export const RemotionRoot: React.FC = () => (
  <>
    {MODULES.map((m) => (
      <Composition
        key={m.id}
        id={m.id.replace(/_/g, "-")}
        component={Narration}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={buildTimeline(m.script, m.manifest).total}
        defaultProps={{ moduleId: m.id }}
      />
    ))}
  </>
);
