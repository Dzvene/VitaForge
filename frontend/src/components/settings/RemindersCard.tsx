"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { reminders } from "@/lib/api/endpoints";
import type { ReminderPrefs } from "@/lib/api/types";
import { Button, Card, CardTitle, Field, Input, Segmented, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import {
  currentEndpoint,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

function OnOff({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Segmented
      value={value ? "on" : "off"}
      onChange={(v) => onChange(v === "on")}
      options={[
        { value: "on", label: t("settings.reminders.on") },
        { value: "off", label: t("settings.reminders.off") },
      ]}
    />
  );
}

export function RemindersCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const supported = pushSupported();

  // Always load prefs — even where this browser can't deliver push, the schedule
  // is worth setting (it applies to the user's other, push-capable devices).
  const config = useQuery({
    queryKey: ["reminders", "config"],
    queryFn: reminders.config,
  });

  const [form, setForm] = useState<ReminderPrefs | null>(null);
  const [deviceOn, setDeviceOn] = useState(false);

  useEffect(() => {
    if (config.data && !form) setForm({ ...config.data.prefs });
  }, [config.data, form]);

  useEffect(() => {
    if (supported) currentEndpoint().then((e) => setDeviceOn(!!e));
  }, [supported]);

  const save = useMutation({
    mutationFn: (body: ReminderPrefs) => reminders.setPrefs(body),
    onSuccess: (saved) => {
      setForm({ ...saved });
      qc.invalidateQueries({ queryKey: ["reminders", "config"] });
      toast(t("settings.reminders.saved"), "ok");
    },
    onError: () => toast(t("settings.reminders.saveError"), "error"),
  });

  const enableDevice = useMutation({
    mutationFn: async () => {
      const key = config.data?.vapid_public_key;
      if (!key) throw new Error("push not configured");
      const payload = await subscribeToPush(key);
      if (!payload) return "denied" as const;
      await reminders.subscribe(payload);
      return "ok" as const;
    },
    onSuccess: (res) => {
      if (res === "denied") {
        toast(t("settings.reminders.permissionDenied"), "error");
        return;
      }
      setDeviceOn(true);
      qc.invalidateQueries({ queryKey: ["reminders", "config"] });
      toast(t("settings.reminders.deviceEnabled"), "ok");
    },
    onError: () => toast(t("settings.reminders.deviceError"), "error"),
  });

  const disableDevice = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await reminders.unsubscribe(endpoint);
    },
    onSuccess: () => {
      setDeviceOn(false);
      qc.invalidateQueries({ queryKey: ["reminders", "config"] });
      toast(t("settings.reminders.deviceDisabled"), "ok");
    },
  });

  const sendTest = useMutation({
    mutationFn: reminders.test,
    onSuccess: (res) => {
      toast(
        res.delivered > 0
          ? t("settings.reminders.testSent")
          : t("settings.reminders.testNoDevices"),
        res.delivered > 0 ? "ok" : "error",
      );
    },
    onError: () => toast(t("settings.reminders.testError"), "error"),
  });

  const onSave = () => {
    if (!form) return;
    save.mutate({
      ...form,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      locale: i18n.language,
    });
  };

  if (config.isLoading || !form) {
    return (
      <Card>
        <CardTitle>{t("settings.reminders.title")}</CardTitle>
        <Skeleton className="h-40" />
      </Card>
    );
  }

  const pushEnabled = config.data?.push_enabled ?? false;
  const set = <K extends keyof ReminderPrefs>(k: K, v: ReminderPrefs[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Card>
      <CardTitle>{t("settings.reminders.title")}</CardTitle>
      <p className="mb-4 text-sm text-ink-muted">{t("settings.reminders.hint")}</p>

      {!pushEnabled && (
        <div className="mb-4 rounded-xl border border-line bg-surface-muted/40 p-3 text-sm text-ink-muted">
          {t("settings.reminders.serverDisabled")}
        </div>
      )}

      <div className="space-y-5">
        <Field label={t("settings.reminders.master")} hint={t("settings.reminders.masterHint")}>
          <OnOff value={form.enabled} onChange={(v) => set("enabled", v)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.reminders.weighIn")}>
            <div className="flex items-center gap-3">
              <OnOff value={form.weigh_in_enabled} onChange={(v) => set("weigh_in_enabled", v)} />
              <Input
                type="time"
                className="w-32"
                value={form.weigh_in_time}
                disabled={!form.weigh_in_enabled}
                onChange={(e) => set("weigh_in_time", e.target.value)}
              />
            </div>
          </Field>
          <Field label={t("settings.reminders.logMeals")}>
            <div className="flex items-center gap-3">
              <OnOff value={form.log_meals_enabled} onChange={(v) => set("log_meals_enabled", v)} />
              <Input
                type="time"
                className="w-32"
                value={form.log_meals_time}
                disabled={!form.log_meals_enabled}
                onChange={(e) => set("log_meals_time", e.target.value)}
              />
            </div>
          </Field>
        </div>

        {/* This-device push subscription — distinct from the schedule above. */}
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-medium text-ink">{t("settings.reminders.deviceTitle")}</p>
          {!supported ? (
            <p className="mt-1 text-sm text-ink-muted">{t("settings.reminders.unsupported")}</p>
          ) : (
            <>
          <p className="mt-1 text-sm text-ink-muted">
            {deviceOn
              ? t("settings.reminders.deviceOn")
              : t("settings.reminders.deviceOff")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!deviceOn ? (
              <Button
                variant="secondary"
                onClick={() => enableDevice.mutate()}
                loading={enableDevice.isPending}
                disabled={!pushEnabled}
              >
                {t("settings.reminders.enableDevice")}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => sendTest.mutate()}
                  loading={sendTest.isPending}
                >
                  {t("settings.reminders.sendTest")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => disableDevice.mutate()}
                  loading={disableDevice.isPending}
                >
                  {t("settings.reminders.disableDevice")}
                </Button>
              </>
            )}
          </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} loading={save.isPending}>
            {t("settings.reminders.save")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
