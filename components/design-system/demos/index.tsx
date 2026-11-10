import type { DemoProps } from "../demo";
import { DataDemos } from "./data";
import { EffectDemos } from "./effects";
import { FeedbackDemos } from "./feedback";
import { FormDemos } from "./forms";
import { LayoutDemos } from "./layout";
import { OverlayDemos } from "./overlays";
import { SelectionDemos } from "./selection";

/** Every named demo of one component. Each category file answers only for its own components. */
export function Demos(props: DemoProps) {
  return (
    <>
      <FormDemos {...props} />
      <SelectionDemos {...props} />
      <OverlayDemos {...props} />
      <FeedbackDemos {...props} />
      <LayoutDemos {...props} />
      <DataDemos {...props} />
      <EffectDemos {...props} />
    </>
  );
}
