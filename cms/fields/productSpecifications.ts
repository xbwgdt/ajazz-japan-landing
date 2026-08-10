import type { Field } from "payload";

const connectionOptions = [
  { label: "Wired", value: "wired" },
  { label: "2.4 GHz", value: "2.4ghz" },
  { label: "Bluetooth", value: "bluetooth" },
];

const operatingSystemOptions = [
  { label: "Windows", value: "windows" },
  { label: "macOS", value: "macos" },
  { label: "Linux", value: "linux" },
  { label: "Android", value: "android" },
  { label: "iOS", value: "ios" },
];

export const productSpecifications: Field = {
  name: "specifications",
  type: "group",
  fields: [
    { name: "keyboardLayout", type: "text" },
    { name: "size", type: "text" },
    { name: "switchType", type: "text" },
    { name: "connectionModes", type: "select", hasMany: true, options: connectionOptions },
    { name: "pollingRateHz", type: "number", min: 1 },
    { name: "rapidTriggerSupported", type: "checkbox" },
    { name: "actuationMinMm", type: "number", min: 0 },
    { name: "actuationMaxMm", type: "number", min: 0 },
    { name: "keycapMaterial", type: "text" },
    { name: "mouseSensor", type: "text" },
    { name: "maximumDpi", type: "number", min: 1 },
    { name: "weightGrams", type: "number", min: 1 },
    { name: "buttonCount", type: "number", min: 1 },
    { name: "headsetConnection", type: "select", hasMany: true, options: connectionOptions },
    { name: "driverSizeMm", type: "number", min: 1 },
    { name: "microphoneType", type: "text" },
    { name: "streamControllerKeyCount", type: "number", min: 1 },
    { name: "streamControllerDisplayCount", type: "number", min: 0 },
    {
      name: "supportedApplications",
      type: "array",
      fields: [{ name: "name", type: "text", required: true }],
    },
    {
      name: "supportedOperatingSystems",
      type: "select",
      dbName: "product_os",
      enumName: "supported_os",
      hasMany: true,
      options: operatingSystemOptions,
    },
  ],
};
