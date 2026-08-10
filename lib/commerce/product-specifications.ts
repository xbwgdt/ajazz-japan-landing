export type ConnectionMode = "wired" | "2.4ghz" | "bluetooth";
export type OperatingSystem = "windows" | "macos" | "linux" | "android" | "ios";

export interface ProductSpecifications {
  keyboardLayout?: string;
  size?: string;
  switchType?: string;
  connectionModes?: ConnectionMode[];
  pollingRateHz?: number;
  rapidTriggerSupported?: boolean;
  actuationMinMm?: number;
  actuationMaxMm?: number;
  keycapMaterial?: string;
  mouseSensor?: string;
  maximumDpi?: number;
  weightGrams?: number;
  buttonCount?: number;
  headsetConnection?: ConnectionMode[];
  driverSizeMm?: number;
  microphoneType?: string;
  streamControllerKeyCount?: number;
  streamControllerDisplayCount?: number;
  supportedApplications?: string[];
  supportedOperatingSystems?: OperatingSystem[];
}

export interface CmsSpecificationRow {
  keyboard_layout: unknown;
  size: unknown;
  switch_type: unknown;
  polling_rate_hz: unknown;
  rapid_trigger_supported: unknown;
  actuation_min_mm: unknown;
  actuation_max_mm: unknown;
  keycap_material: unknown;
  mouse_sensor: unknown;
  maximum_dpi: unknown;
  weight_grams: unknown;
  button_count: unknown;
  driver_size_mm: unknown;
  microphone_type: unknown;
  stream_controller_key_count: unknown;
  stream_controller_display_count: unknown;
  connection_modes: unknown;
  headset_connection: unknown;
  supported_applications: unknown;
  supported_operating_systems: unknown;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function list<T extends string>(value: unknown, allowed?: ReadonlySet<string>): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry): entry is T => Boolean(entry) && (!allowed || allowed.has(entry)));
  return entries.length ? entries : undefined;
}

export function mapCmsSpecifications(row: CmsSpecificationRow): ProductSpecifications {
  const values: ProductSpecifications = {
    keyboardLayout: text(row.keyboard_layout),
    size: text(row.size),
    switchType: text(row.switch_type),
    connectionModes: list<ConnectionMode>(row.connection_modes, new Set(["wired", "2.4ghz", "bluetooth"])),
    pollingRateHz: number(row.polling_rate_hz),
    rapidTriggerSupported: typeof row.rapid_trigger_supported === "boolean" ? row.rapid_trigger_supported : undefined,
    actuationMinMm: number(row.actuation_min_mm),
    actuationMaxMm: number(row.actuation_max_mm),
    keycapMaterial: text(row.keycap_material),
    mouseSensor: text(row.mouse_sensor),
    maximumDpi: number(row.maximum_dpi),
    weightGrams: number(row.weight_grams),
    buttonCount: number(row.button_count),
    headsetConnection: list<ConnectionMode>(row.headset_connection, new Set(["wired", "2.4ghz", "bluetooth"])),
    driverSizeMm: number(row.driver_size_mm),
    microphoneType: text(row.microphone_type),
    streamControllerKeyCount: number(row.stream_controller_key_count),
    streamControllerDisplayCount: number(row.stream_controller_display_count),
    supportedApplications: list<string>(row.supported_applications),
    supportedOperatingSystems: list<OperatingSystem>(row.supported_operating_systems, new Set(["windows", "macos", "linux", "android", "ios"])),
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

const CONNECTION_LABELS: Record<ConnectionMode, string> = { wired: "有線", "2.4ghz": "2.4 GHz", bluetooth: "Bluetooth" };
const OS_LABELS: Record<OperatingSystem, string> = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", ios: "iOS" };

export function productSpecificationRows(specifications: ProductSpecifications): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value?: string }> = [
    { label: "キー配列", value: specifications.keyboardLayout },
    { label: "サイズ", value: specifications.size },
    { label: "スイッチ", value: specifications.switchType },
    { label: "接続方式", value: specifications.connectionModes?.map((mode) => CONNECTION_LABELS[mode]).join(" / ") },
    { label: "ポーリングレート", value: specifications.pollingRateHz === undefined ? undefined : `${specifications.pollingRateHz.toLocaleString("ja-JP")} Hz` },
    { label: "ラピッドトリガー", value: specifications.rapidTriggerSupported === undefined ? undefined : specifications.rapidTriggerSupported ? "対応" : "非対応" },
    { label: "作動点", value: specifications.actuationMinMm === undefined ? undefined : specifications.actuationMaxMm === undefined ? `${specifications.actuationMinMm} mm` : `${specifications.actuationMinMm} - ${specifications.actuationMaxMm} mm` },
    { label: "キーキャップ", value: specifications.keycapMaterial },
    { label: "センサー", value: specifications.mouseSensor },
    { label: "最大DPI", value: specifications.maximumDpi?.toLocaleString("ja-JP") },
    { label: "重量", value: specifications.weightGrams === undefined ? undefined : `${specifications.weightGrams} g` },
    { label: "ボタン数", value: specifications.buttonCount?.toString() },
    { label: "ヘッドセット接続", value: specifications.headsetConnection?.map((mode) => CONNECTION_LABELS[mode]).join(" / ") },
    { label: "ドライバー径", value: specifications.driverSizeMm === undefined ? undefined : `${specifications.driverSizeMm} mm` },
    { label: "マイク", value: specifications.microphoneType },
    { label: "コントロールキー数", value: specifications.streamControllerKeyCount?.toString() },
    { label: "ディスプレイ数", value: specifications.streamControllerDisplayCount?.toString() },
    { label: "対応アプリ", value: specifications.supportedApplications?.join(" / ") },
    { label: "対応OS", value: specifications.supportedOperatingSystems?.map((os) => OS_LABELS[os]).join(" / ") },
  ];
  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
}
