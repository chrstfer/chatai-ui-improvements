/**
 * Language Definition and Category Types
 */

import { ToolbarTool } from "./org/components/OrgToolbar.tsx";

export type LanguageCategory =
    | "programming"
    | "markup"
    | "data"
    | "query"
    | "shell"
    | "config"
    | "math"
    | "other";

export interface LanguageDefinition {
    id: string;
    name: string;
    aliases: string[];
    category: LanguageCategory;
    fileExtension?: string;
    description?: string;
    tools?: ToolbarTool[];
}
