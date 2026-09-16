// This file is compiled, never executed. Its package-name import resolves the
// built public exports under both Bundler and NodeNext module resolution.
import { createRef, type ComponentRef, type ComponentPropsWithRef, type RefCallback } from "react";
import {
  Button, Checkbox, Radio, Select, Slider, Switch,
  type ButtonProps, type CheckboxProps, type RadioProps, type SelectProps, type SliderProps, type SwitchProps,
} from "@ionizeio/canvas";
import type { View } from "react-native";

const host = createRef<View>();
const callback: RefCallback<View> = (node) => { node?.focus(); };
const cleanup: RefCallback<View> = (node) => { node?.measure((_x, _y, _w, _h) => {}); return () => {}; };
const button: ComponentPropsWithRef<typeof Button> = { ref: host, children: "Save", primary: true };
const checkbox: CheckboxProps = { defaultChecked: true };
const radio: RadioProps = { value: "daily" };
const select: SelectProps = { options: ["Apple"] };
const slider: SliderProps = { defaultValue: 30 };
const toggle: SwitchProps = { defaultChecked: true };
const existingButtonProps: ButtonProps = { onPress: () => {}, href: "/destination" };

export const controls = <>
  <Button {...button} />
  <Button {...existingButtonProps} ref={callback} />
  <Checkbox {...checkbox} ref={host} />
  <Radio {...radio} ref={callback} />
  <Select {...select} ref={cleanup} />
  <Slider {...slider} ref={host} />
  <Switch {...toggle} ref={callback} />
</>;

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type Hosts = [
  Assert<Equal<ComponentRef<typeof Button>, View>>,
  Assert<Equal<ComponentRef<typeof Checkbox>, View>>,
  Assert<Equal<ComponentRef<typeof Radio>, View>>,
  Assert<Equal<ComponentRef<typeof Select>, View>>,
  Assert<Equal<ComponentRef<typeof Slider>, View>>,
  Assert<Equal<ComponentRef<typeof Switch>, View>>,
];

const domOnly = createRef<HTMLButtonElement>();
// @ts-expect-error Public refs expose React Native hosts, not DOM-only elements.
export const invalidButton = <Button ref={domOnly} />;
// @ts-expect-error Select exposes its trigger host, not its selection value.
export const invalidSelect = <Select ref={createRef<string>()} />;
// @ts-expect-error The Slider host is not the numeric slider value.
export const invalidSlider = <Slider ref={createRef<number>()} />;
