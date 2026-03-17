import { createBrowserRouter } from "react-router";
import Welcome from "./screens/Welcome";
import EmotionSelection from "./screens/EmotionSelection";
import Expression from "./screens/Expression";
import SupportResponse from "./screens/SupportResponse";
import QuickCheck from "./screens/QuickCheck";
import Solutions from "./screens/Solutions";
import CheckIn from "./screens/CheckIn";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Welcome,
  },
  {
    path: "/emotions",
    Component: EmotionSelection,
  },
  {
    path: "/expression",
    Component: Expression,
  },
  {
    path: "/quickcheck",
    Component: QuickCheck,
  },
  {
    path: "/support",
    Component: SupportResponse,
  },
  {
    path: "/solutions",
    Component: Solutions,
  },
  {
    path: "/checkin",
    Component: CheckIn,
  },
]);
