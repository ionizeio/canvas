import { createForm, createFormSection } from "./form.shared.js";
import { androidSkin } from "./form.styles.js";
import { Button as ButtonAndroid } from "../../atoms/button/button.android.js";

// Android Form. Material 3 has no form component, so the skin is the web's (Dark
// Factory's form); the actions row still composes the Android-skinned Button, so the
// ghost Cancel and the raised primary submit keep their Material 3 shape and ripple,
// and the WEB docs 3-up shows the M3 control in the Android row (a barrel import
// would resolve the web atom there). Metro resolves this file on Android; on a real
// device it resolves the right extension regardless.
export const Form = createForm(androidSkin, ButtonAndroid);
export const FormSection = createFormSection(androidSkin);
export type { FormProps, FormSectionProps } from "./form.shared.js";
