/** Raw feature tuple: [name, description, owner, optional limitation status, note] */
export type RawFeature =
  | [name: string, description: string, app: string]
  | [name: string, description: string, app: string, status: "limited", note: string];

export interface RawFeatureCategory {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  features: RawFeature[];
}
