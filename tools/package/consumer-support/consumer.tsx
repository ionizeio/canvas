import { createRef, type ComponentRef, type RefCallback } from "react";
import { Button, Checkbox, Radio, Select, Slider, Switch, Input, Autocomplete, Form, ThemeProvider, OverlayProvider, type ButtonProps } from "@ionizeio/canvas";
import type { View, TextInput } from "react-native";

const host = createRef<View>();
const input = createRef<TextInput>();
const callback: RefCallback<View> = (node) => { node?.focus(); };
const button: ButtonProps = { children: "Save", primary: true, onPress: () => {} };
export const consumer = <ThemeProvider light><OverlayProvider>
  <Form onSubmit={() => {}} submitLabel="Save">
    <Input ref={input} label="Workspace" autoComplete="organization" onChangeText={(value) => { value.toUpperCase(); }} />
    <Autocomplete label="City" options={["Toronto"]} value="Toronto" onSelect={(value) => { value.toUpperCase(); }} />
    <Button {...button} ref={callback} />
    <Checkbox ref={host} defaultChecked>Subscribe</Checkbox>
    <Radio ref={host} value="daily">Daily</Radio>
    <Select ref={host} options={["Toronto"]} onSelect={(value) => { value.toUpperCase(); }} />
    <Slider ref={host} defaultValue={30} />
    <Switch ref={host} defaultChecked>Updates</Switch>
  </Form>
</OverlayProvider></ThemeProvider>;

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type Hosts = [
  Assert<Equal<ComponentRef<typeof Button>, View>>, Assert<Equal<ComponentRef<typeof Checkbox>, View>>,
  Assert<Equal<ComponentRef<typeof Radio>, View>>, Assert<Equal<ComponentRef<typeof Select>, View>>,
  Assert<Equal<ComponentRef<typeof Slider>, View>>, Assert<Equal<ComponentRef<typeof Switch>, View>>,
];
// @ts-expect-error A control exposes its RN host, never its numeric value.
export const invalidRef = <Slider ref={createRef<number>()} />;
// @ts-expect-error Selection callbacks carry strings.
export const invalidSelection = <Select onSelect={(value: number) => { value.toFixed(); }} />;
