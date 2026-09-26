import { Platform, type Role } from "react-native";

// The role of an option list's container (Listbox, Select, Autocomplete, the PhoneInput's
// country list and the Command's results), spelled for the runtime and not for the skin,
// like the Stepper's (src/atoms/stepper/stepper.accessibility.ts): the docs' web three-up
// renders the iOS and Android builds in a browser, and every column's DOM stays a listbox.
//
// The web keeps ARIA's "listbox": React Native Web writes it to the DOM, where each
// role="option" row requires it as its parent. React Native's native role parser has no
// listbox (the Role overload of fromRawValue in
// ReactCommon/react/renderer/components/view/accessibilityPropsConversions.h), so natively
// every mounted list logged "Unsupported Role value: listbox" and a react_native_expect
// failure, and then carried no role at all (Android's view manager drops the value too).
// Natively the container is a "list", which the parser accepts. iOS derives the same empty
// trait set from it as from listbox, so the role itself changes nothing for VoiceOver. On
// Android a container that is a native view becomes android.widget.AbsListView where it was
// a plain view group, so TalkBack reads it as a list ("Teams. List", then "In list Teams" on
// the first row). That needs the container to be a native view that holds its rows: Fabric
// removes a View whose props neither paint nor mark it (a role or a label does not count) and
// hoists the children out of one that is not a stacking context. The Select, Autocomplete,
// PhoneInput and Command lists carry a nativeID and the Listbox sets collapsable={false}, each
// of which forms one. test/native-roles.test.ts reads the accepted roles from the parser.
export const LISTBOX_ROLES = { web: "listbox", native: "list" satisfies Role } as const;

// React Native's Role type omits "listbox" because its native parser does; this is the one
// role cast in the kit and the docs, and it only ever reaches the DOM.
export const LISTBOX: Role = Platform.OS === "web" ? (LISTBOX_ROLES.web as Role) : LISTBOX_ROLES.native;
