import type { PropsWithChildren } from "react";
import { View } from "react-native";

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

type GenericProps = PropsWithChildren<{
  style?: any;
}>;

export const PROVIDER_GOOGLE = undefined;

export function MapView({ style, children }: GenericProps) {
  return <View style={style}>{children}</View>;
}

export function Marker() {
  return null;
}

export function UrlTile() {
  return null;
}
