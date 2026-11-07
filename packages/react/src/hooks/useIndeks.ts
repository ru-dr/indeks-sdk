import { useIndeksContext } from "../context/IndeksContext";
import type { IndeksContextValue } from "../context/IndeksContext";

export type UseIndeksReturn = IndeksContextValue;

export const useIndeks = (): UseIndeksReturn => useIndeksContext();
