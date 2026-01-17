import { setState } from "./index.js";

export function setCoordinate(coordinate) {
  // coordinate: { lat: number, lon: number } | undefined
  return setState({ coordinate });
}

export function setRadiusInKm(r) {
  const n = Number(r);
  return setState({ radiusInKm: Number.isFinite(n) ? n : 10 });
}

export function setAddress(address) {
  return setState({ address });
}