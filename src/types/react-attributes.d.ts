import "react";

declare module "react" {
  interface Attributes {
    /** Home-page language selection is currently consumed by the hero only. */
    language?: "en" | "ur";
  }
}
