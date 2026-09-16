// Writes the MIT LICENSE into the package immediately before it is packed for npm.
//
// Canvas is deliberately split: the SOURCE in this repository is not licensed (all rights
// reserved), while the PUBLISHED PACKAGE — the compiled dist that consumers install — is
// MIT. As the copyright holder you can grant different terms to different recipients, and
// this is the mechanism.
//
// It has to be generated rather than committed, because a LICENSE file at the repository
// root is exactly how GitHub decides a repository's licence: committing MIT there would
// publish the source under MIT too, which is the opposite of the intent. Generating it at
// pack time means the tarball carries the grant and the repository does not.
//
// npm always includes a root LICENSE in the tarball regardless of the `files` array, so
// writing it here is enough; it is gitignored so it never lands in a commit.
//
// Run automatically by `prepublishOnly`. Safe to run by hand: it only writes one file.

import fs from "node:fs";

const YEAR = "2026";
const HOLDER = "Robert Nannier";

const TEXT = `MIT License

Copyright (c) ${YEAR} ${HOLDER}

This license applies to this distributed package (the compiled output published to
npm as @ionizeio/canvas). The project's source repository is not covered by it and
remains all rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

fs.writeFileSync("LICENSE", TEXT);
console.log(`licensegen: wrote LICENSE (MIT, ${HOLDER}) for the published package`);
