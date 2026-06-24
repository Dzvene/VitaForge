"use client";

import { useQuery } from "@tanstack/react-query";
import {
  calibration,
  coaching,
  diary,
  nutrition,
  profile,
  weight,
} from "@/lib/api/endpoints";

export const qk = {
  profile: ["profile"] as const,
  target: ["nutrition", "target"] as const,
  day: (d: string) => ["diary", "day", d] as const,
  guidance: (d: string) => ["coaching", "guidance", d] as const,
  weight: ["weight", "series"] as const,
  calibration: ["calibration", "status"] as const,
  warnings: ["coaching", "warnings"] as const,
  hints: ["coaching", "hints"] as const,
  recent: ["diary", "recent"] as const,
};

export const useProfile = () =>
  useQuery({ queryKey: qk.profile, queryFn: profile.get, retry: false });

export const useTarget = () =>
  useQuery({ queryKey: qk.target, queryFn: nutrition.target });

export const useDay = (day: string) =>
  useQuery({ queryKey: qk.day(day), queryFn: () => diary.day(day) });

export const useGuidance = (day: string) =>
  useQuery({ queryKey: qk.guidance(day), queryFn: () => coaching.dayGuidance(day) });

export const useWeightSeries = () =>
  useQuery({ queryKey: qk.weight, queryFn: weight.series });

export const useCalibration = () =>
  useQuery({ queryKey: qk.calibration, queryFn: calibration.status });

export const useWarnings = () =>
  useQuery({ queryKey: qk.warnings, queryFn: coaching.warnings });

export const useHints = () =>
  useQuery({ queryKey: qk.hints, queryFn: coaching.hints, staleTime: Infinity });
