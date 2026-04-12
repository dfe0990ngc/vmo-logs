import { useMemo } from "react";

export const useBaseFileName = (filePath: string): string => useMemo(() => filePath.split("/").pop() ?? filePath, [filePath]);