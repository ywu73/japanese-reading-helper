// ==UserScript==
// @name         日语网页汉字罗马音与片假名英译 ｜ YomiRuby
// @name:zh-CN   日语网页汉字罗马音与片假名英译 ｜ YomiRuby
// @name:en      YomiRuby
// @namespace    yomi-ruby.local
// @version      0.6.1
// @description  Add selectable local or online Kanji Romaji and optional online Katakana English ruby to Japanese web text.
// @description:zh-CN  为日语网页添加可选的本地或联网汉字罗马音，以及可选的联网片假名英译。
// @homepageURL  https://github.com/ywu73/yomi-ruby
// @supportURL   https://github.com/ywu73/yomi-ruby/issues
// @downloadURL  https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js
// @updateURL    https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @noframes
// @run-at       document-idle
// @resource     yomi-ruby-dict-base https://unpkg.com/kuromoji@0.1.2/dict/base.dat.gz#sha256=0803327762e1c93ca731e4319ab8343340f2806bb84941207782cde9d2d5a8eb
// @resource     yomi-ruby-dict-cc https://unpkg.com/kuromoji@0.1.2/dict/cc.dat.gz#sha256=02b7631be0d4de3a1a75cd9f9cc51536e4f94c9e6b389b813e06ba0f6e7de765
// @resource     yomi-ruby-dict-check https://unpkg.com/kuromoji@0.1.2/dict/check.dat.gz#sha256=193ae0035fff6fe812b58d9ee730e7a7d7ee601d918481ce51075c58114f6cc9
// @resource     yomi-ruby-dict-tid https://unpkg.com/kuromoji@0.1.2/dict/tid.dat.gz#sha256=d43d831cb6fb0f0a411739cd287a6d5e998e121a8daca614df14a81a0dcac586
// @resource     yomi-ruby-dict-tid-map https://unpkg.com/kuromoji@0.1.2/dict/tid_map.dat.gz#sha256=33efd5ffd87a70f669add093fa39dee44341d58f940844ef107c8fd98bb795b2
// @resource     yomi-ruby-dict-tid-pos https://unpkg.com/kuromoji@0.1.2/dict/tid_pos.dat.gz#sha256=60dbfc99a6ab993f30c5dab648bec6ad7f9aaefa5c14e1843837d95e509f8895
// @resource     yomi-ruby-dict-unk https://unpkg.com/kuromoji@0.1.2/dict/unk.dat.gz#sha256=f7f991cdeb9bfd3e9c0e4577cc50ee0815a11c508cccd444a9d3ab3c81521100
// @resource     yomi-ruby-dict-unk-char https://unpkg.com/kuromoji@0.1.2/dict/unk_char.dat.gz#sha256=9a8e86fd9aff32d323fbb59f5a7006f05927a11f8173c90712cc56293aeb3225
// @resource     yomi-ruby-dict-unk-compat https://unpkg.com/kuromoji@0.1.2/dict/unk_compat.dat.gz#sha256=50f60aa29bc2e86c2903ab8c825bb6fa604d2b294d96941c1d3924259791899d
// @resource     yomi-ruby-dict-unk-invoke https://unpkg.com/kuromoji@0.1.2/dict/unk_invoke.dat.gz#sha256=6b210889548457c3006913afd12c8b525562255f2709e404604be9614a25e94c
// @resource     yomi-ruby-dict-unk-map https://unpkg.com/kuromoji@0.1.2/dict/unk_map.dat.gz#sha256=6df12460e5477230bb6fd9641def918b699fc0a8868016b6c9f794488630509b
// @resource     yomi-ruby-dict-unk-pos https://unpkg.com/kuromoji@0.1.2/dict/unk_pos.dat.gz#sha256=5b183a29f281acc7e0542beca47b83f7985047c0a2d27e78a66f32276be5ad11
// @connect      translate.googleapis.com
// @connect      www.bing.com
// @connect      cn.bing.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceURL
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// ==/UserScript==
//
// YomiRuby copyright (c) 2026 ywu73.
// Third-party provenance and independent license files are retained in the repository.
//
// ===== YomiRuby — MIT License =====
// MIT License
//
// Copyright (c) 2026 ywu73
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// ===== Kuromoji.js — Apache License 2.0 =====
//
//                                  Apache License
//                            Version 2.0, January 2004
//                         http://www.apache.org/licenses/
//
//    TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
//
//    1. Definitions.
//
//       "License" shall mean the terms and conditions for use, reproduction,
//       and distribution as defined by Sections 1 through 9 of this document.
//
//       "Licensor" shall mean the copyright owner or entity authorized by
//       the copyright owner that is granting the License.
//
//       "Legal Entity" shall mean the union of the acting entity and all
//       other entities that control, are controlled by, or are under common
//       control with that entity. For the purposes of this definition,
//       "control" means (i) the power, direct or indirect, to cause the
//       direction or management of such entity, whether by contract or
//       otherwise, or (ii) ownership of fifty percent (50%) or more of the
//       outstanding shares, or (iii) beneficial ownership of such entity.
//
//       "You" (or "Your") shall mean an individual or Legal Entity
//       exercising permissions granted by this License.
//
//       "Source" form shall mean the preferred form for making modifications,
//       including but not limited to software source code, documentation
//       source, and configuration files.
//
//       "Object" form shall mean any form resulting from mechanical
//       transformation or translation of a Source form, including but
//       not limited to compiled object code, generated documentation,
//       and conversions to other media types.
//
//       "Work" shall mean the work of authorship, whether in Source or
//       Object form, made available under the License, as indicated by a
//       copyright notice that is included in or attached to the work
//       (an example is provided in the Appendix below).
//
//       "Derivative Works" shall mean any work, whether in Source or Object
//       form, that is based on (or derived from) the Work and for which the
//       editorial revisions, annotations, elaborations, or other modifications
//       represent, as a whole, an original work of authorship. For the purposes
//       of this License, Derivative Works shall not include works that remain
//       separable from, or merely link (or bind by name) to the interfaces of,
//       the Work and Derivative Works thereof.
//
//       "Contribution" shall mean any work of authorship, including
//       the original version of the Work and any modifications or additions
//       to that Work or Derivative Works thereof, that is intentionally
//       submitted to Licensor for inclusion in the Work by the copyright owner
//       or by an individual or Legal Entity authorized to submit on behalf of
//       the copyright owner. For the purposes of this definition, "submitted"
//       means any form of electronic, verbal, or written communication sent
//       to the Licensor or its representatives, including but not limited to
//       communication on electronic mailing lists, source code control systems,
//       and issue tracking systems that are managed by, or on behalf of, the
//       Licensor for the purpose of discussing and improving the Work, but
//       excluding communication that is conspicuously marked or otherwise
//       designated in writing by the copyright owner as "Not a Contribution."
//
//       "Contributor" shall mean Licensor and any individual or Legal Entity
//       on behalf of whom a Contribution has been received by Licensor and
//       subsequently incorporated within the Work.
//
//    2. Grant of Copyright License. Subject to the terms and conditions of
//       this License, each Contributor hereby grants to You a perpetual,
//       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
//       copyright license to reproduce, prepare Derivative Works of,
//       publicly display, publicly perform, sublicense, and distribute the
//       Work and such Derivative Works in Source or Object form.
//
//    3. Grant of Patent License. Subject to the terms and conditions of
//       this License, each Contributor hereby grants to You a perpetual,
//       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
//       (except as stated in this section) patent license to make, have made,
//       use, offer to sell, sell, import, and otherwise transfer the Work,
//       where such license applies only to those patent claims licensable
//       by such Contributor that are necessarily infringed by their
//       Contribution(s) alone or by combination of their Contribution(s)
//       with the Work to which such Contribution(s) was submitted. If You
//       institute patent litigation against any entity (including a
//       cross-claim or counterclaim in a lawsuit) alleging that the Work
//       or a Contribution incorporated within the Work constitutes direct
//       or contributory patent infringement, then any patent licenses
//       granted to You under this License for that Work shall terminate
//       as of the date such litigation is filed.
//
//    4. Redistribution. You may reproduce and distribute copies of the
//       Work or Derivative Works thereof in any medium, with or without
//       modifications, and in Source or Object form, provided that You
//       meet the following conditions:
//
//       (a) You must give any other recipients of the Work or
//           Derivative Works a copy of this License; and
//
//       (b) You must cause any modified files to carry prominent notices
//           stating that You changed the files; and
//
//       (c) You must retain, in the Source form of any Derivative Works
//           that You distribute, all copyright, patent, trademark, and
//           attribution notices from the Source form of the Work,
//           excluding those notices that do not pertain to any part of
//           the Derivative Works; and
//
//       (d) If the Work includes a "NOTICE" text file as part of its
//           distribution, then any Derivative Works that You distribute must
//           include a readable copy of the attribution notices contained
//           within such NOTICE file, excluding those notices that do not
//           pertain to any part of the Derivative Works, in at least one
//           of the following places: within a NOTICE text file distributed
//           as part of the Derivative Works; within the Source form or
//           documentation, if provided along with the Derivative Works; or,
//           within a display generated by the Derivative Works, if and
//           wherever such third-party notices normally appear. The contents
//           of the NOTICE file are for informational purposes only and
//           do not modify the License. You may add Your own attribution
//           notices within Derivative Works that You distribute, alongside
//           or as an addendum to the NOTICE text from the Work, provided
//           that such additional attribution notices cannot be construed
//           as modifying the License.
//
//       You may add Your own copyright statement to Your modifications and
//       may provide additional or different license terms and conditions
//       for use, reproduction, or distribution of Your modifications, or
//       for any such Derivative Works as a whole, provided Your use,
//       reproduction, and distribution of the Work otherwise complies with
//       the conditions stated in this License.
//
//    5. Submission of Contributions. Unless You explicitly state otherwise,
//       any Contribution intentionally submitted for inclusion in the Work
//       by You to the Licensor shall be under the terms and conditions of
//       this License, without any additional terms or conditions.
//       Notwithstanding the above, nothing herein shall supersede or modify
//       the terms of any separate license agreement you may have executed
//       with Licensor regarding such Contributions.
//
//    6. Trademarks. This License does not grant permission to use the trade
//       names, trademarks, service marks, or product names of the Licensor,
//       except as required for reasonable and customary use in describing the
//       origin of the Work and reproducing the content of the NOTICE file.
//
//    7. Disclaimer of Warranty. Unless required by applicable law or
//       agreed to in writing, Licensor provides the Work (and each
//       Contributor provides its Contributions) on an "AS IS" BASIS,
//       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
//       implied, including, without limitation, any warranties or conditions
//       of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
//       PARTICULAR PURPOSE. You are solely responsible for determining the
//       appropriateness of using or redistributing the Work and assume any
//       risks associated with Your exercise of permissions under this License.
//
//    8. Limitation of Liability. In no event and under no legal theory,
//       whether in tort (including negligence), contract, or otherwise,
//       unless required by applicable law (such as deliberate and grossly
//       negligent acts) or agreed to in writing, shall any Contributor be
//       liable to You for damages, including any direct, indirect, special,
//       incidental, or consequential damages of any character arising as a
//       result of this License or out of the use or inability to use the
//       Work (including but not limited to damages for loss of goodwill,
//       work stoppage, computer failure or malfunction, or any and all
//       other commercial damages or losses), even if such Contributor
//       has been advised of the possibility of such damages.
//
//    9. Accepting Warranty or Additional Liability. While redistributing
//       the Work or Derivative Works thereof, You may choose to offer,
//       and charge a fee for, acceptance of support, warranty, indemnity,
//       or other liability obligations and/or rights consistent with this
//       License. However, in accepting such obligations, You may act only
//       on Your own behalf and on Your sole responsibility, not on behalf
//       of any other Contributor, and only if You agree to indemnify,
//       defend, and hold each Contributor harmless for any liability
//       incurred by, or claims asserted against, such Contributor by reason
//       of your accepting any such warranty or additional liability.
//
//    END OF TERMS AND CONDITIONS
//
//    APPENDIX: How to apply the Apache License to your work.
//
//       To apply the Apache License to your work, attach the following
//       boilerplate notice, with the fields enclosed by brackets "[]"
//       replaced with your own identifying information. (Don't include
//       the brackets!)  The text should be enclosed in the appropriate
//       comment syntax for the file format. We also recommend that a
//       file or class name and description of purpose be included on the
//       same "printed page" as the copyright notice for easier
//       identification within third-party archives.
//
//    Copyright [yyyy] [name of copyright owner]
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//
// ===== Kuromoji.js — upstream code copyright =====
// Copyright 2014 Takuya Asano
// Copyright 2010-2014 Atilika Inc. and contributors
//
// ===== Kuromoji.js — upstream NOTICE =====
// Library dependencies
// ====================
//
// This software includes a binary and/or source version of data from
//
// * mecab-ipadic-2.7.0-20070801
//
// which can be obtained from
//
// http://atilika.com/releases/mecab-ipadic/mecab-ipadic-2.7.0-20070801.tar.gz
//
// or
//
// http://jaist.dl.sourceforge.net/project/mecab/mecab-ipadic/2.7.0-20070801/mecab-ipadic-2.7.0-20070801.tar.gz
//
//
//
// Copyright and license
// =====================
//
//
// mecab-ipadic-2.7.0-20070801
// ---------------------------
//
// Copyright 2000, 2001, 2002, 2003 Nara Institute of Science
// and Technology.  All Rights Reserved.
//
// Use, reproduction, and distribution of this software is permitted.
// Any copy of this software, whether in its original form or modified,
// must include both the above copyright notice and the following
// paragraphs.
//
// Nara Institute of Science and Technology (NAIST),
// the copyright holders, disclaims all warranties with regard to this
// software, including all implied warranties of merchantability and
// fitness, in no event shall NAIST be liable for
// any special, indirect or consequential damages or any damages
// whatsoever resulting from loss of use, data or profits, whether in an
// action of contract, negligence or other tortuous action, arising out
// of or in connection with the use or performance of this software.
//
// A large portion of the dictionary entries
// originate from ICOT Free Software.  The following conditions for ICOT
// Free Software applies to the current dictionary as well.
//
// Each User may also freely distribute the Program, whether in its
// original form or modified, to any third party or parties, PROVIDED
// that the provisions of Section 3 ("NO WARRANTY") will ALWAYS appear
// on, or be attached to, the Program, which is distributed substantially
// in the same form as set out herein and that such intended
// distribution, if actually made, will neither violate or otherwise
// contravene any of the laws and regulations of the countries having
// jurisdiction over the User or the intended distribution itself.
//
// NO WARRANTY
//
// The program was produced on an experimental basis in the course of the
// research and development conducted during the project and is provided
// to users as so produced on an experimental basis.  Accordingly, the
// program is provided without any warranty whatsoever, whether express,
// implied, statutory or otherwise.  The term "warranty" used herein
// includes, but is not limited to, any warranty of the quality,
// performance, merchantability and fitness for a particular purpose of
// the program and the nonexistence of any infringement or violation of
// any right of any third party.
//
// Each user of the program will agree and understand, and be deemed to
// have agreed and understood, that there is no warranty whatsoever for
// the program and, accordingly, the entire risk arising from or
// otherwise connected with the program is assumed by the user.
//
// Therefore, neither ICOT, the copyright holder, or any other
// organization that participated in or was otherwise related to the
// development of the program and their respective officials, directors,
// officers and other employees shall be held liable for any and all
// damages, including, without limitation, general, special, incidental
// and consequential damages, arising out of or otherwise in connection
// with the use or inability to use the program or any product, material
// or result produced or otherwise obtained by using the program,
// regardless of whether they have been advised of, or otherwise had
// knowledge of, the possibility of such damages at any time during the
// project or thereafter.  Each user will be deemed to have agreed to the
// foregoing by his or her commencement of use of the program.  The term
// "use" as used herein includes, but is not limited to, the use,
// modification, copying and distribution of the program and the
// production of secondary products from the program.
//
// In the case where the program, whether in its original form or
// modified, was distributed or delivered to or received by a user from
// any person, organization or entity other than ICOT, unless it makes or
// grants independently of ICOT any specific warranty to the user in
// writing, such person, organization or entity, will also be exempted
// from and not be held liable to the user for any such damages as noted
// above as far as the program is concerned.
// ˜˜
//
// ===== doublearray 0.0.2 — MIT License =====
// The MIT License (MIT)
//
// Copyright (c) 2014 Takuya Asano
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// ===== zlibjs 0.3.1 — MIT License =====
// /**
//  * @license
//  * zlib.js
//  * JavaScript Zlib Library
//  * https://github.com/imaya/zlib.js
//  *
//  * The MIT License
//  *
//  * Copyright (c) 2012 imaya
//  *
//  * Permission is hereby granted, free of charge, to any person obtaining a copy
//  * of this software and associated documentation files (the "Software"), to deal
//  * in the Software without restriction, including without limitation the rights
//  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  * copies of the Software, and to permit persons to whom the Software is
//  * furnished to do so, subject to the following conditions:
//  *
//  * The above copyright notice and this permission notice shall be included in
//  * all copies or substantial portions of the Software.
//  *
//  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  * THE SOFTWARE.
//  */
//
// ===== Katakana Terminator — MIT License =====
// The MIT License (MIT)
//
// Copyright (c) 2017-2022 Katakana Terminator Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/kuromoji/src/viterbi/ViterbiNode.js
  var require_ViterbiNode = __commonJS({
    "node_modules/kuromoji/src/viterbi/ViterbiNode.js"(exports, module) {
      "use strict";
      function ViterbiNode(node_name, node_cost, start_pos, length, type, left_id, right_id, surface_form) {
        this.name = node_name;
        this.cost = node_cost;
        this.start_pos = start_pos;
        this.length = length;
        this.left_id = left_id;
        this.right_id = right_id;
        this.prev = null;
        this.surface_form = surface_form;
        if (type === "BOS") {
          this.shortest_cost = 0;
        } else {
          this.shortest_cost = Number.MAX_VALUE;
        }
        this.type = type;
      }
      module.exports = ViterbiNode;
    }
  });

  // node_modules/kuromoji/src/viterbi/ViterbiLattice.js
  var require_ViterbiLattice = __commonJS({
    "node_modules/kuromoji/src/viterbi/ViterbiLattice.js"(exports, module) {
      "use strict";
      var ViterbiNode = require_ViterbiNode();
      function ViterbiLattice() {
        this.nodes_end_at = [];
        this.nodes_end_at[0] = [new ViterbiNode(-1, 0, 0, 0, "BOS", 0, 0, "")];
        this.eos_pos = 1;
      }
      ViterbiLattice.prototype.append = function(node) {
        var last_pos = node.start_pos + node.length - 1;
        if (this.eos_pos < last_pos) {
          this.eos_pos = last_pos;
        }
        var prev_nodes = this.nodes_end_at[last_pos];
        if (prev_nodes == null) {
          prev_nodes = [];
        }
        prev_nodes.push(node);
        this.nodes_end_at[last_pos] = prev_nodes;
      };
      ViterbiLattice.prototype.appendEos = function() {
        var last_index = this.nodes_end_at.length;
        this.eos_pos++;
        this.nodes_end_at[last_index] = [new ViterbiNode(-1, 0, this.eos_pos, 0, "EOS", 0, 0, "")];
      };
      module.exports = ViterbiLattice;
    }
  });

  // node_modules/kuromoji/src/util/SurrogateAwareString.js
  var require_SurrogateAwareString = __commonJS({
    "node_modules/kuromoji/src/util/SurrogateAwareString.js"(exports, module) {
      "use strict";
      function SurrogateAwareString(str) {
        this.str = str;
        this.index_mapping = [];
        for (var pos = 0; pos < str.length; pos++) {
          var ch = str.charAt(pos);
          this.index_mapping.push(pos);
          if (SurrogateAwareString.isSurrogatePair(ch)) {
            pos++;
          }
        }
        this.length = this.index_mapping.length;
      }
      SurrogateAwareString.prototype.slice = function(index) {
        if (this.index_mapping.length <= index) {
          return "";
        }
        var surrogate_aware_index = this.index_mapping[index];
        return this.str.slice(surrogate_aware_index);
      };
      SurrogateAwareString.prototype.charAt = function(index) {
        if (this.str.length <= index) {
          return "";
        }
        var surrogate_aware_start_index = this.index_mapping[index];
        var surrogate_aware_end_index = this.index_mapping[index + 1];
        if (surrogate_aware_end_index == null) {
          return this.str.slice(surrogate_aware_start_index);
        }
        return this.str.slice(surrogate_aware_start_index, surrogate_aware_end_index);
      };
      SurrogateAwareString.prototype.charCodeAt = function(index) {
        if (this.index_mapping.length <= index) {
          return NaN;
        }
        var surrogate_aware_index = this.index_mapping[index];
        var upper = this.str.charCodeAt(surrogate_aware_index);
        var lower;
        if (upper >= 55296 && upper <= 56319 && surrogate_aware_index < this.str.length) {
          lower = this.str.charCodeAt(surrogate_aware_index + 1);
          if (lower >= 56320 && lower <= 57343) {
            return (upper - 55296) * 1024 + lower - 56320 + 65536;
          }
        }
        return upper;
      };
      SurrogateAwareString.prototype.toString = function() {
        return this.str;
      };
      SurrogateAwareString.isSurrogatePair = function(ch) {
        var utf16_code = ch.charCodeAt(0);
        if (utf16_code >= 55296 && utf16_code <= 56319) {
          return true;
        } else {
          return false;
        }
      };
      module.exports = SurrogateAwareString;
    }
  });

  // node_modules/kuromoji/src/viterbi/ViterbiBuilder.js
  var require_ViterbiBuilder = __commonJS({
    "node_modules/kuromoji/src/viterbi/ViterbiBuilder.js"(exports, module) {
      "use strict";
      var ViterbiNode = require_ViterbiNode();
      var ViterbiLattice = require_ViterbiLattice();
      var SurrogateAwareString = require_SurrogateAwareString();
      function ViterbiBuilder(dic) {
        this.trie = dic.trie;
        this.token_info_dictionary = dic.token_info_dictionary;
        this.unknown_dictionary = dic.unknown_dictionary;
      }
      ViterbiBuilder.prototype.build = function(sentence_str) {
        var lattice = new ViterbiLattice();
        var sentence = new SurrogateAwareString(sentence_str);
        var key, trie_id, left_id, right_id, word_cost;
        for (var pos = 0; pos < sentence.length; pos++) {
          var tail = sentence.slice(pos);
          var vocabulary = this.trie.commonPrefixSearch(tail);
          for (var n = 0; n < vocabulary.length; n++) {
            trie_id = vocabulary[n].v;
            key = vocabulary[n].k;
            var token_info_ids = this.token_info_dictionary.target_map[trie_id];
            for (var i = 0; i < token_info_ids.length; i++) {
              var token_info_id = parseInt(token_info_ids[i]);
              left_id = this.token_info_dictionary.dictionary.getShort(token_info_id);
              right_id = this.token_info_dictionary.dictionary.getShort(token_info_id + 2);
              word_cost = this.token_info_dictionary.dictionary.getShort(token_info_id + 4);
              lattice.append(new ViterbiNode(token_info_id, word_cost, pos + 1, key.length, "KNOWN", left_id, right_id, key));
            }
          }
          var surrogate_aware_tail = new SurrogateAwareString(tail);
          var head_char = new SurrogateAwareString(surrogate_aware_tail.charAt(0));
          var head_char_class = this.unknown_dictionary.lookup(head_char.toString());
          if (vocabulary == null || vocabulary.length === 0 || head_char_class.is_always_invoke === 1) {
            key = head_char;
            if (head_char_class.is_grouping === 1 && 1 < surrogate_aware_tail.length) {
              for (var k = 1; k < surrogate_aware_tail.length; k++) {
                var next_char = surrogate_aware_tail.charAt(k);
                var next_char_class = this.unknown_dictionary.lookup(next_char);
                if (head_char_class.class_name !== next_char_class.class_name) {
                  break;
                }
                key += next_char;
              }
            }
            var unk_ids = this.unknown_dictionary.target_map[head_char_class.class_id];
            for (var j = 0; j < unk_ids.length; j++) {
              var unk_id = parseInt(unk_ids[j]);
              left_id = this.unknown_dictionary.dictionary.getShort(unk_id);
              right_id = this.unknown_dictionary.dictionary.getShort(unk_id + 2);
              word_cost = this.unknown_dictionary.dictionary.getShort(unk_id + 4);
              lattice.append(new ViterbiNode(unk_id, word_cost, pos + 1, key.length, "UNKNOWN", left_id, right_id, key.toString()));
            }
          }
        }
        lattice.appendEos();
        return lattice;
      };
      module.exports = ViterbiBuilder;
    }
  });

  // node_modules/kuromoji/src/viterbi/ViterbiSearcher.js
  var require_ViterbiSearcher = __commonJS({
    "node_modules/kuromoji/src/viterbi/ViterbiSearcher.js"(exports, module) {
      "use strict";
      function ViterbiSearcher(connection_costs) {
        this.connection_costs = connection_costs;
      }
      ViterbiSearcher.prototype.search = function(lattice) {
        lattice = this.forward(lattice);
        return this.backward(lattice);
      };
      ViterbiSearcher.prototype.forward = function(lattice) {
        var i, j, k;
        for (i = 1; i <= lattice.eos_pos; i++) {
          var nodes = lattice.nodes_end_at[i];
          if (nodes == null) {
            continue;
          }
          for (j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            var cost = Number.MAX_VALUE;
            var shortest_prev_node;
            var prev_nodes = lattice.nodes_end_at[node.start_pos - 1];
            if (prev_nodes == null) {
              continue;
            }
            for (k = 0; k < prev_nodes.length; k++) {
              var prev_node = prev_nodes[k];
              var edge_cost;
              if (node.left_id == null || prev_node.right_id == null) {
                console.log("Left or right is null");
                edge_cost = 0;
              } else {
                edge_cost = this.connection_costs.get(prev_node.right_id, node.left_id);
              }
              var _cost = prev_node.shortest_cost + edge_cost + node.cost;
              if (_cost < cost) {
                shortest_prev_node = prev_node;
                cost = _cost;
              }
            }
            node.prev = shortest_prev_node;
            node.shortest_cost = cost;
          }
        }
        return lattice;
      };
      ViterbiSearcher.prototype.backward = function(lattice) {
        var shortest_path = [];
        var eos = lattice.nodes_end_at[lattice.nodes_end_at.length - 1][0];
        var node_back = eos.prev;
        if (node_back == null) {
          return [];
        }
        while (node_back.type !== "BOS") {
          shortest_path.push(node_back);
          if (node_back.prev == null) {
            return [];
          }
          node_back = node_back.prev;
        }
        return shortest_path.reverse();
      };
      module.exports = ViterbiSearcher;
    }
  });

  // node_modules/kuromoji/src/util/IpadicFormatter.js
  var require_IpadicFormatter = __commonJS({
    "node_modules/kuromoji/src/util/IpadicFormatter.js"(exports, module) {
      "use strict";
      function IpadicFormatter() {
      }
      IpadicFormatter.prototype.formatEntry = function(word_id, position, type, features) {
        var token = {};
        token.word_id = word_id;
        token.word_type = type;
        token.word_position = position;
        token.surface_form = features[0];
        token.pos = features[1];
        token.pos_detail_1 = features[2];
        token.pos_detail_2 = features[3];
        token.pos_detail_3 = features[4];
        token.conjugated_type = features[5];
        token.conjugated_form = features[6];
        token.basic_form = features[7];
        token.reading = features[8];
        token.pronunciation = features[9];
        return token;
      };
      IpadicFormatter.prototype.formatUnknownEntry = function(word_id, position, type, features, surface_form) {
        var token = {};
        token.word_id = word_id;
        token.word_type = type;
        token.word_position = position;
        token.surface_form = surface_form;
        token.pos = features[1];
        token.pos_detail_1 = features[2];
        token.pos_detail_2 = features[3];
        token.pos_detail_3 = features[4];
        token.conjugated_type = features[5];
        token.conjugated_form = features[6];
        token.basic_form = features[7];
        return token;
      };
      module.exports = IpadicFormatter;
    }
  });

  // node_modules/kuromoji/src/Tokenizer.js
  var require_Tokenizer = __commonJS({
    "node_modules/kuromoji/src/Tokenizer.js"(exports, module) {
      "use strict";
      var ViterbiBuilder = require_ViterbiBuilder();
      var ViterbiSearcher = require_ViterbiSearcher();
      var IpadicFormatter = require_IpadicFormatter();
      var PUNCTUATION = /、|。/;
      function Tokenizer2(dic) {
        this.token_info_dictionary = dic.token_info_dictionary;
        this.unknown_dictionary = dic.unknown_dictionary;
        this.viterbi_builder = new ViterbiBuilder(dic);
        this.viterbi_searcher = new ViterbiSearcher(dic.connection_costs);
        this.formatter = new IpadicFormatter();
      }
      Tokenizer2.splitByPunctuation = function(input) {
        var sentences = [];
        var tail = input;
        while (true) {
          if (tail === "") {
            break;
          }
          var index = tail.search(PUNCTUATION);
          if (index < 0) {
            sentences.push(tail);
            break;
          }
          sentences.push(tail.substring(0, index + 1));
          tail = tail.substring(index + 1);
        }
        return sentences;
      };
      Tokenizer2.prototype.tokenize = function(text) {
        var sentences = Tokenizer2.splitByPunctuation(text);
        var tokens = [];
        for (var i = 0; i < sentences.length; i++) {
          var sentence = sentences[i];
          this.tokenizeForSentence(sentence, tokens);
        }
        return tokens;
      };
      Tokenizer2.prototype.tokenizeForSentence = function(sentence, tokens) {
        if (tokens == null) {
          tokens = [];
        }
        var lattice = this.getLattice(sentence);
        var best_path = this.viterbi_searcher.search(lattice);
        var last_pos = 0;
        if (tokens.length > 0) {
          last_pos = tokens[tokens.length - 1].word_position;
        }
        for (var j = 0; j < best_path.length; j++) {
          var node = best_path[j];
          var token, features, features_line;
          if (node.type === "KNOWN") {
            features_line = this.token_info_dictionary.getFeatures(node.name);
            if (features_line == null) {
              features = [];
            } else {
              features = features_line.split(",");
            }
            token = this.formatter.formatEntry(node.name, last_pos + node.start_pos, node.type, features);
          } else if (node.type === "UNKNOWN") {
            features_line = this.unknown_dictionary.getFeatures(node.name);
            if (features_line == null) {
              features = [];
            } else {
              features = features_line.split(",");
            }
            token = this.formatter.formatUnknownEntry(node.name, last_pos + node.start_pos, node.type, features, node.surface_form);
          } else {
            token = this.formatter.formatEntry(node.name, last_pos + node.start_pos, node.type, []);
          }
          tokens.push(token);
        }
        return tokens;
      };
      Tokenizer2.prototype.getLattice = function(text) {
        return this.viterbi_builder.build(text);
      };
      module.exports = Tokenizer2;
    }
  });

  // node_modules/doublearray/doublearray.js
  var require_doublearray = __commonJS({
    "node_modules/doublearray/doublearray.js"(exports, module) {
      (function() {
        "use strict";
        var TERM_CHAR = "\0", TERM_CODE = 0, ROOT_ID = 0, NOT_FOUND = -1, BASE_SIGNED = true, CHECK_SIGNED = true, BASE_BYTES = 4, CHECK_BYTES = 4, MEMORY_EXPAND_RATIO = 2;
        var newBC = function(initial_size) {
          if (initial_size == null) {
            initial_size = 1024;
          }
          var initBase = function(_base, start, end) {
            for (var i = start; i < end; i++) {
              _base[i] = -i + 1;
            }
            if (0 < check.array[check.array.length - 1]) {
              var last_used_id = check.array.length - 2;
              while (0 < check.array[last_used_id]) {
                last_used_id--;
              }
              _base[start] = -last_used_id;
            }
          };
          var initCheck = function(_check, start, end) {
            for (var i = start; i < end; i++) {
              _check[i] = -i - 1;
            }
          };
          var realloc = function(min_size) {
            var new_size = min_size * MEMORY_EXPAND_RATIO;
            var base_new_array = newArrayBuffer(base.signed, base.bytes, new_size);
            initBase(base_new_array, base.array.length, new_size);
            base_new_array.set(base.array);
            base.array = null;
            base.array = base_new_array;
            var check_new_array = newArrayBuffer(check.signed, check.bytes, new_size);
            initCheck(check_new_array, check.array.length, new_size);
            check_new_array.set(check.array);
            check.array = null;
            check.array = check_new_array;
          };
          var first_unused_node = ROOT_ID + 1;
          var base = {
            signed: BASE_SIGNED,
            bytes: BASE_BYTES,
            array: newArrayBuffer(BASE_SIGNED, BASE_BYTES, initial_size)
          };
          var check = {
            signed: CHECK_SIGNED,
            bytes: CHECK_BYTES,
            array: newArrayBuffer(CHECK_SIGNED, CHECK_BYTES, initial_size)
          };
          base.array[ROOT_ID] = 1;
          check.array[ROOT_ID] = ROOT_ID;
          initBase(base.array, ROOT_ID + 1, base.array.length);
          initCheck(check.array, ROOT_ID + 1, check.array.length);
          return {
            getBaseBuffer: function() {
              return base.array;
            },
            getCheckBuffer: function() {
              return check.array;
            },
            loadBaseBuffer: function(base_buffer) {
              base.array = base_buffer;
              return this;
            },
            loadCheckBuffer: function(check_buffer) {
              check.array = check_buffer;
              return this;
            },
            size: function() {
              return Math.max(base.array.length, check.array.length);
            },
            getBase: function(index) {
              if (base.array.length - 1 < index) {
                return -index + 1;
              }
              return base.array[index];
            },
            getCheck: function(index) {
              if (check.array.length - 1 < index) {
                return -index - 1;
              }
              return check.array[index];
            },
            setBase: function(index, base_value) {
              if (base.array.length - 1 < index) {
                realloc(index);
              }
              base.array[index] = base_value;
            },
            setCheck: function(index, check_value) {
              if (check.array.length - 1 < index) {
                realloc(index);
              }
              check.array[index] = check_value;
            },
            setFirstUnusedNode: function(index) {
              first_unused_node = index;
            },
            getFirstUnusedNode: function() {
              return first_unused_node;
            },
            shrink: function() {
              var last_index = this.size() - 1;
              while (true) {
                if (0 <= check.array[last_index]) {
                  break;
                }
                last_index--;
              }
              base.array = base.array.subarray(0, last_index + 2);
              check.array = check.array.subarray(0, last_index + 2);
            },
            calc: function() {
              var unused_count = 0;
              var size = check.array.length;
              for (var i = 0; i < size; i++) {
                if (check.array[i] < 0) {
                  unused_count++;
                }
              }
              return {
                all: size,
                unused: unused_count,
                efficiency: (size - unused_count) / size
              };
            },
            dump: function() {
              var dump_base = "";
              var dump_check = "";
              var i;
              for (i = 0; i < base.array.length; i++) {
                dump_base = dump_base + " " + this.getBase(i);
              }
              for (i = 0; i < check.array.length; i++) {
                dump_check = dump_check + " " + this.getCheck(i);
              }
              console.log("base:" + dump_base);
              console.log("chck:" + dump_check);
              return "base:" + dump_base + " chck:" + dump_check;
            }
          };
        };
        function DoubleArrayBuilder(initial_size) {
          this.bc = newBC(initial_size);
          this.keys = [];
        }
        DoubleArrayBuilder.prototype.append = function(key, record) {
          this.keys.push({ k: key, v: record });
          return this;
        };
        DoubleArrayBuilder.prototype.build = function(keys, sorted) {
          if (keys == null) {
            keys = this.keys;
          }
          if (keys == null) {
            return new DoubleArray(this.bc);
          }
          if (sorted == null) {
            sorted = false;
          }
          var buff_keys = keys.map(function(k) {
            return {
              k: stringToUtf8Bytes(k.k + TERM_CHAR),
              v: k.v
            };
          });
          if (sorted) {
            this.keys = buff_keys;
          } else {
            this.keys = buff_keys.sort(function(k1, k2) {
              var b1 = k1.k;
              var b2 = k2.k;
              var min_length = Math.min(b1.length, b2.length);
              for (var pos = 0; pos < min_length; pos++) {
                if (b1[pos] === b2[pos]) {
                  continue;
                }
                return b1[pos] - b2[pos];
              }
              return b1.length - b2.length;
            });
          }
          buff_keys = null;
          this._build(ROOT_ID, 0, 0, this.keys.length);
          return new DoubleArray(this.bc);
        };
        DoubleArrayBuilder.prototype._build = function(parent_index, position, start, length) {
          var children_info = this.getChildrenInfo(position, start, length);
          var _base = this.findAllocatableBase(children_info);
          this.setBC(parent_index, children_info, _base);
          for (var i = 0; i < children_info.length; i = i + 3) {
            var child_code = children_info[i];
            if (child_code === TERM_CODE) {
              continue;
            }
            var child_start = children_info[i + 1];
            var child_len = children_info[i + 2];
            var child_index = _base + child_code;
            this._build(child_index, position + 1, child_start, child_len);
          }
        };
        DoubleArrayBuilder.prototype.getChildrenInfo = function(position, start, length) {
          var current_char = this.keys[start].k[position];
          var i = 0;
          var children_info = new Int32Array(length * 3);
          children_info[i++] = current_char;
          children_info[i++] = start;
          var next_pos = start;
          var start_pos = start;
          for (; next_pos < start + length; next_pos++) {
            var next_char = this.keys[next_pos].k[position];
            if (current_char !== next_char) {
              children_info[i++] = next_pos - start_pos;
              children_info[i++] = next_char;
              children_info[i++] = next_pos;
              current_char = next_char;
              start_pos = next_pos;
            }
          }
          children_info[i++] = next_pos - start_pos;
          children_info = children_info.subarray(0, i);
          return children_info;
        };
        DoubleArrayBuilder.prototype.setBC = function(parent_id, children_info, _base) {
          var bc = this.bc;
          bc.setBase(parent_id, _base);
          var i;
          for (i = 0; i < children_info.length; i = i + 3) {
            var code = children_info[i];
            var child_id = _base + code;
            var prev_unused_id = -bc.getBase(child_id);
            var next_unused_id = -bc.getCheck(child_id);
            if (child_id !== bc.getFirstUnusedNode()) {
              bc.setCheck(prev_unused_id, -next_unused_id);
            } else {
              bc.setFirstUnusedNode(next_unused_id);
            }
            bc.setBase(next_unused_id, -prev_unused_id);
            var check = parent_id;
            bc.setCheck(child_id, check);
            if (code === TERM_CODE) {
              var start_pos = children_info[i + 1];
              var value = this.keys[start_pos].v;
              if (value == null) {
                value = 0;
              }
              var base = -value - 1;
              bc.setBase(child_id, base);
            }
          }
        };
        DoubleArrayBuilder.prototype.findAllocatableBase = function(children_info) {
          var bc = this.bc;
          var _base;
          var curr = bc.getFirstUnusedNode();
          while (true) {
            _base = curr - children_info[0];
            if (_base < 0) {
              curr = -bc.getCheck(curr);
              continue;
            }
            var empty_area_found = true;
            for (var i = 0; i < children_info.length; i = i + 3) {
              var code = children_info[i];
              var candidate_id = _base + code;
              if (!this.isUnusedNode(candidate_id)) {
                curr = -bc.getCheck(curr);
                empty_area_found = false;
                break;
              }
            }
            if (empty_area_found) {
              return _base;
            }
          }
        };
        DoubleArrayBuilder.prototype.isUnusedNode = function(index) {
          var bc = this.bc;
          var check = bc.getCheck(index);
          if (index === ROOT_ID) {
            return false;
          }
          if (check < 0) {
            return true;
          }
          return false;
        };
        function DoubleArray(bc) {
          this.bc = bc;
          this.bc.shrink();
        }
        DoubleArray.prototype.contain = function(key) {
          var bc = this.bc;
          key += TERM_CHAR;
          var buffer = stringToUtf8Bytes(key);
          var parent = ROOT_ID;
          var child = NOT_FOUND;
          for (var i = 0; i < buffer.length; i++) {
            var code = buffer[i];
            child = this.traverse(parent, code);
            if (child === NOT_FOUND) {
              return false;
            }
            if (bc.getBase(child) <= 0) {
              return true;
            } else {
              parent = child;
              continue;
            }
          }
          return false;
        };
        DoubleArray.prototype.lookup = function(key) {
          key += TERM_CHAR;
          var buffer = stringToUtf8Bytes(key);
          var parent = ROOT_ID;
          var child = NOT_FOUND;
          for (var i = 0; i < buffer.length; i++) {
            var code = buffer[i];
            child = this.traverse(parent, code);
            if (child === NOT_FOUND) {
              return NOT_FOUND;
            }
            parent = child;
          }
          var base = this.bc.getBase(child);
          if (base <= 0) {
            return -base - 1;
          } else {
            return NOT_FOUND;
          }
        };
        DoubleArray.prototype.commonPrefixSearch = function(key) {
          var buffer = stringToUtf8Bytes(key);
          var parent = ROOT_ID;
          var child = NOT_FOUND;
          var result = [];
          for (var i = 0; i < buffer.length; i++) {
            var code = buffer[i];
            child = this.traverse(parent, code);
            if (child !== NOT_FOUND) {
              parent = child;
              var grand_child = this.traverse(child, TERM_CODE);
              if (grand_child !== NOT_FOUND) {
                var base = this.bc.getBase(grand_child);
                var r = {};
                if (base <= 0) {
                  r.v = -base - 1;
                }
                r.k = utf8BytesToString(arrayCopy(buffer, 0, i + 1));
                result.push(r);
              }
              continue;
            } else {
              break;
            }
          }
          return result;
        };
        DoubleArray.prototype.traverse = function(parent, code) {
          var child = this.bc.getBase(parent) + code;
          if (this.bc.getCheck(child) === parent) {
            return child;
          } else {
            return NOT_FOUND;
          }
        };
        DoubleArray.prototype.size = function() {
          return this.bc.size();
        };
        DoubleArray.prototype.calc = function() {
          return this.bc.calc();
        };
        DoubleArray.prototype.dump = function() {
          return this.bc.dump();
        };
        var newArrayBuffer = function(signed, bytes, size) {
          if (signed) {
            switch (bytes) {
              case 1:
                return new Int8Array(size);
              case 2:
                return new Int16Array(size);
              case 4:
                return new Int32Array(size);
              default:
                throw new RangeError("Invalid newArray parameter element_bytes:" + bytes);
            }
          } else {
            switch (bytes) {
              case 1:
                return new Uint8Array(size);
              case 2:
                return new Uint16Array(size);
              case 4:
                return new Uint32Array(size);
              default:
                throw new RangeError("Invalid newArray parameter element_bytes:" + bytes);
            }
          }
        };
        var arrayCopy = function(src, src_offset, length) {
          var buffer = new ArrayBuffer(length);
          var dstU8 = new Uint8Array(buffer, 0, length);
          var srcU8 = src.subarray(src_offset, length);
          dstU8.set(srcU8);
          return dstU8;
        };
        var stringToUtf8Bytes = function(str) {
          var bytes = new Uint8Array(new ArrayBuffer(str.length * 4));
          var i = 0, j = 0;
          while (i < str.length) {
            var unicode_code;
            var utf16_code = str.charCodeAt(i++);
            if (utf16_code >= 55296 && utf16_code <= 56319) {
              var upper = utf16_code;
              var lower = str.charCodeAt(i++);
              if (lower >= 56320 && lower <= 57343) {
                unicode_code = (upper - 55296) * (1 << 10) + (1 << 16) + (lower - 56320);
              } else {
                return null;
              }
            } else {
              unicode_code = utf16_code;
            }
            if (unicode_code < 128) {
              bytes[j++] = unicode_code;
            } else if (unicode_code < 1 << 11) {
              bytes[j++] = unicode_code >>> 6 | 192;
              bytes[j++] = unicode_code & 63 | 128;
            } else if (unicode_code < 1 << 16) {
              bytes[j++] = unicode_code >>> 12 | 224;
              bytes[j++] = unicode_code >> 6 & 63 | 128;
              bytes[j++] = unicode_code & 63 | 128;
            } else if (unicode_code < 1 << 21) {
              bytes[j++] = unicode_code >>> 18 | 240;
              bytes[j++] = unicode_code >> 12 & 63 | 128;
              bytes[j++] = unicode_code >> 6 & 63 | 128;
              bytes[j++] = unicode_code & 63 | 128;
            } else {
            }
          }
          return bytes.subarray(0, j);
        };
        var utf8BytesToString = function(bytes) {
          var str = "";
          var code, b1, b2, b3, b4, upper, lower;
          var i = 0;
          while (i < bytes.length) {
            b1 = bytes[i++];
            if (b1 < 128) {
              code = b1;
            } else if (b1 >> 5 === 6) {
              b2 = bytes[i++];
              code = (b1 & 31) << 6 | b2 & 63;
            } else if (b1 >> 4 === 14) {
              b2 = bytes[i++];
              b3 = bytes[i++];
              code = (b1 & 15) << 12 | (b2 & 63) << 6 | b3 & 63;
            } else {
              b2 = bytes[i++];
              b3 = bytes[i++];
              b4 = bytes[i++];
              code = (b1 & 7) << 18 | (b2 & 63) << 12 | (b3 & 63) << 6 | b4 & 63;
            }
            if (code < 65536) {
              str += String.fromCharCode(code);
            } else {
              code -= 65536;
              upper = 55296 | code >> 10;
              lower = 56320 | code & 1023;
              str += String.fromCharCode(upper, lower);
            }
          }
          return str;
        };
        var doublearray = {
          builder: function(initial_size) {
            return new DoubleArrayBuilder(initial_size);
          },
          load: function(base_buffer, check_buffer) {
            var bc = newBC(0);
            bc.loadBaseBuffer(base_buffer);
            bc.loadCheckBuffer(check_buffer);
            return new DoubleArray(bc);
          }
        };
        if ("undefined" === typeof module) {
          window.doublearray = doublearray;
        } else {
          module.exports = doublearray;
        }
      })();
    }
  });

  // node_modules/kuromoji/src/util/ByteBuffer.js
  var require_ByteBuffer = __commonJS({
    "node_modules/kuromoji/src/util/ByteBuffer.js"(exports, module) {
      "use strict";
      var stringToUtf8Bytes = function(str) {
        var bytes = new Uint8Array(str.length * 4);
        var i = 0, j = 0;
        while (i < str.length) {
          var unicode_code;
          var utf16_code = str.charCodeAt(i++);
          if (utf16_code >= 55296 && utf16_code <= 56319) {
            var upper = utf16_code;
            var lower = str.charCodeAt(i++);
            if (lower >= 56320 && lower <= 57343) {
              unicode_code = (upper - 55296) * (1 << 10) + (1 << 16) + (lower - 56320);
            } else {
              return null;
            }
          } else {
            unicode_code = utf16_code;
          }
          if (unicode_code < 128) {
            bytes[j++] = unicode_code;
          } else if (unicode_code < 1 << 11) {
            bytes[j++] = unicode_code >>> 6 | 192;
            bytes[j++] = unicode_code & 63 | 128;
          } else if (unicode_code < 1 << 16) {
            bytes[j++] = unicode_code >>> 12 | 224;
            bytes[j++] = unicode_code >> 6 & 63 | 128;
            bytes[j++] = unicode_code & 63 | 128;
          } else if (unicode_code < 1 << 21) {
            bytes[j++] = unicode_code >>> 18 | 240;
            bytes[j++] = unicode_code >> 12 & 63 | 128;
            bytes[j++] = unicode_code >> 6 & 63 | 128;
            bytes[j++] = unicode_code & 63 | 128;
          } else {
          }
        }
        return bytes.subarray(0, j);
      };
      var utf8BytesToString = function(bytes) {
        var str = "";
        var code, b1, b2, b3, b4, upper, lower;
        var i = 0;
        while (i < bytes.length) {
          b1 = bytes[i++];
          if (b1 < 128) {
            code = b1;
          } else if (b1 >> 5 === 6) {
            b2 = bytes[i++];
            code = (b1 & 31) << 6 | b2 & 63;
          } else if (b1 >> 4 === 14) {
            b2 = bytes[i++];
            b3 = bytes[i++];
            code = (b1 & 15) << 12 | (b2 & 63) << 6 | b3 & 63;
          } else {
            b2 = bytes[i++];
            b3 = bytes[i++];
            b4 = bytes[i++];
            code = (b1 & 7) << 18 | (b2 & 63) << 12 | (b3 & 63) << 6 | b4 & 63;
          }
          if (code < 65536) {
            str += String.fromCharCode(code);
          } else {
            code -= 65536;
            upper = 55296 | code >> 10;
            lower = 56320 | code & 1023;
            str += String.fromCharCode(upper, lower);
          }
        }
        return str;
      };
      function ByteBuffer(arg) {
        var initial_size;
        if (arg == null) {
          initial_size = 1024 * 1024;
        } else if (typeof arg === "number") {
          initial_size = arg;
        } else if (arg instanceof Uint8Array) {
          this.buffer = arg;
          this.position = 0;
          return;
        } else {
          throw typeof arg + " is invalid parameter type for ByteBuffer constructor";
        }
        this.buffer = new Uint8Array(initial_size);
        this.position = 0;
      }
      ByteBuffer.prototype.size = function() {
        return this.buffer.length;
      };
      ByteBuffer.prototype.reallocate = function() {
        var new_array = new Uint8Array(this.buffer.length * 2);
        new_array.set(this.buffer);
        this.buffer = new_array;
      };
      ByteBuffer.prototype.shrink = function() {
        this.buffer = this.buffer.subarray(0, this.position);
        return this.buffer;
      };
      ByteBuffer.prototype.put = function(b) {
        if (this.buffer.length < this.position + 1) {
          this.reallocate();
        }
        this.buffer[this.position++] = b;
      };
      ByteBuffer.prototype.get = function(index) {
        if (index == null) {
          index = this.position;
          this.position += 1;
        }
        if (this.buffer.length < index + 1) {
          return 0;
        }
        return this.buffer[index];
      };
      ByteBuffer.prototype.putShort = function(num) {
        if (65535 < num) {
          throw num + " is over short value";
        }
        var lower = 255 & num;
        var upper = (65280 & num) >> 8;
        this.put(lower);
        this.put(upper);
      };
      ByteBuffer.prototype.getShort = function(index) {
        if (index == null) {
          index = this.position;
          this.position += 2;
        }
        if (this.buffer.length < index + 2) {
          return 0;
        }
        var lower = this.buffer[index];
        var upper = this.buffer[index + 1];
        var value = (upper << 8) + lower;
        if (value & 32768) {
          value = -(value - 1 ^ 65535);
        }
        return value;
      };
      ByteBuffer.prototype.putInt = function(num) {
        if (4294967295 < num) {
          throw num + " is over integer value";
        }
        var b0 = 255 & num;
        var b1 = (65280 & num) >> 8;
        var b2 = (16711680 & num) >> 16;
        var b3 = (4278190080 & num) >> 24;
        this.put(b0);
        this.put(b1);
        this.put(b2);
        this.put(b3);
      };
      ByteBuffer.prototype.getInt = function(index) {
        if (index == null) {
          index = this.position;
          this.position += 4;
        }
        if (this.buffer.length < index + 4) {
          return 0;
        }
        var b0 = this.buffer[index];
        var b1 = this.buffer[index + 1];
        var b2 = this.buffer[index + 2];
        var b3 = this.buffer[index + 3];
        return (b3 << 24) + (b2 << 16) + (b1 << 8) + b0;
      };
      ByteBuffer.prototype.readInt = function() {
        var pos = this.position;
        this.position += 4;
        return this.getInt(pos);
      };
      ByteBuffer.prototype.putString = function(str) {
        var bytes = stringToUtf8Bytes(str);
        for (var i = 0; i < bytes.length; i++) {
          this.put(bytes[i]);
        }
        this.put(0);
      };
      ByteBuffer.prototype.getString = function(index) {
        var buf = [], ch;
        if (index == null) {
          index = this.position;
        }
        while (true) {
          if (this.buffer.length < index + 1) {
            break;
          }
          ch = this.get(index++);
          if (ch === 0) {
            break;
          } else {
            buf.push(ch);
          }
        }
        this.position = index;
        return utf8BytesToString(buf);
      };
      module.exports = ByteBuffer;
    }
  });

  // node_modules/kuromoji/src/dict/TokenInfoDictionary.js
  var require_TokenInfoDictionary = __commonJS({
    "node_modules/kuromoji/src/dict/TokenInfoDictionary.js"(exports, module) {
      "use strict";
      var ByteBuffer = require_ByteBuffer();
      function TokenInfoDictionary() {
        this.dictionary = new ByteBuffer(10 * 1024 * 1024);
        this.target_map = {};
        this.pos_buffer = new ByteBuffer(10 * 1024 * 1024);
      }
      TokenInfoDictionary.prototype.buildDictionary = function(entries) {
        var dictionary_entries = {};
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (entry.length < 4) {
            continue;
          }
          var surface_form = entry[0];
          var left_id = entry[1];
          var right_id = entry[2];
          var word_cost = entry[3];
          var feature = entry.slice(4).join(",");
          if (!isFinite(left_id) || !isFinite(right_id) || !isFinite(word_cost)) {
            console.log(entry);
          }
          var token_info_id = this.put(left_id, right_id, word_cost, surface_form, feature);
          dictionary_entries[token_info_id] = surface_form;
        }
        this.dictionary.shrink();
        this.pos_buffer.shrink();
        return dictionary_entries;
      };
      TokenInfoDictionary.prototype.put = function(left_id, right_id, word_cost, surface_form, feature) {
        var token_info_id = this.dictionary.position;
        var pos_id = this.pos_buffer.position;
        this.dictionary.putShort(left_id);
        this.dictionary.putShort(right_id);
        this.dictionary.putShort(word_cost);
        this.dictionary.putInt(pos_id);
        this.pos_buffer.putString(surface_form + "," + feature);
        return token_info_id;
      };
      TokenInfoDictionary.prototype.addMapping = function(source, target) {
        var mapping = this.target_map[source];
        if (mapping == null) {
          mapping = [];
        }
        mapping.push(target);
        this.target_map[source] = mapping;
      };
      TokenInfoDictionary.prototype.targetMapToBuffer = function() {
        var buffer = new ByteBuffer();
        var map_keys_size = Object.keys(this.target_map).length;
        buffer.putInt(map_keys_size);
        for (var key in this.target_map) {
          var values = this.target_map[key];
          var map_values_size = values.length;
          buffer.putInt(parseInt(key));
          buffer.putInt(map_values_size);
          for (var i = 0; i < values.length; i++) {
            buffer.putInt(values[i]);
          }
        }
        return buffer.shrink();
      };
      TokenInfoDictionary.prototype.loadDictionary = function(array_buffer) {
        this.dictionary = new ByteBuffer(array_buffer);
        return this;
      };
      TokenInfoDictionary.prototype.loadPosVector = function(array_buffer) {
        this.pos_buffer = new ByteBuffer(array_buffer);
        return this;
      };
      TokenInfoDictionary.prototype.loadTargetMap = function(array_buffer) {
        var buffer = new ByteBuffer(array_buffer);
        buffer.position = 0;
        this.target_map = {};
        buffer.readInt();
        while (true) {
          if (buffer.buffer.length < buffer.position + 1) {
            break;
          }
          var key = buffer.readInt();
          var map_values_size = buffer.readInt();
          for (var i = 0; i < map_values_size; i++) {
            var value = buffer.readInt();
            this.addMapping(key, value);
          }
        }
        return this;
      };
      TokenInfoDictionary.prototype.getFeatures = function(token_info_id_str) {
        var token_info_id = parseInt(token_info_id_str);
        if (isNaN(token_info_id)) {
          return "";
        }
        var pos_id = this.dictionary.getInt(token_info_id + 6);
        return this.pos_buffer.getString(pos_id);
      };
      module.exports = TokenInfoDictionary;
    }
  });

  // node_modules/kuromoji/src/dict/ConnectionCosts.js
  var require_ConnectionCosts = __commonJS({
    "node_modules/kuromoji/src/dict/ConnectionCosts.js"(exports, module) {
      "use strict";
      function ConnectionCosts(forward_dimension, backward_dimension) {
        this.forward_dimension = forward_dimension;
        this.backward_dimension = backward_dimension;
        this.buffer = new Int16Array(forward_dimension * backward_dimension + 2);
        this.buffer[0] = forward_dimension;
        this.buffer[1] = backward_dimension;
      }
      ConnectionCosts.prototype.put = function(forward_id, backward_id, cost) {
        var index = forward_id * this.backward_dimension + backward_id + 2;
        if (this.buffer.length < index + 1) {
          throw "ConnectionCosts buffer overflow";
        }
        this.buffer[index] = cost;
      };
      ConnectionCosts.prototype.get = function(forward_id, backward_id) {
        var index = forward_id * this.backward_dimension + backward_id + 2;
        if (this.buffer.length < index + 1) {
          throw "ConnectionCosts buffer overflow";
        }
        return this.buffer[index];
      };
      ConnectionCosts.prototype.loadConnectionCosts = function(connection_costs_buffer) {
        this.forward_dimension = connection_costs_buffer[0];
        this.backward_dimension = connection_costs_buffer[1];
        this.buffer = connection_costs_buffer;
      };
      module.exports = ConnectionCosts;
    }
  });

  // node_modules/kuromoji/src/dict/CharacterClass.js
  var require_CharacterClass = __commonJS({
    "node_modules/kuromoji/src/dict/CharacterClass.js"(exports, module) {
      "use strict";
      function CharacterClass(class_id, class_name, is_always_invoke, is_grouping, max_length) {
        this.class_id = class_id;
        this.class_name = class_name;
        this.is_always_invoke = is_always_invoke;
        this.is_grouping = is_grouping;
        this.max_length = max_length;
      }
      module.exports = CharacterClass;
    }
  });

  // node_modules/kuromoji/src/dict/InvokeDefinitionMap.js
  var require_InvokeDefinitionMap = __commonJS({
    "node_modules/kuromoji/src/dict/InvokeDefinitionMap.js"(exports, module) {
      "use strict";
      var ByteBuffer = require_ByteBuffer();
      var CharacterClass = require_CharacterClass();
      function InvokeDefinitionMap() {
        this.map = [];
        this.lookup_table = {};
      }
      InvokeDefinitionMap.load = function(invoke_def_buffer) {
        var invoke_def = new InvokeDefinitionMap();
        var character_category_definition = [];
        var buffer = new ByteBuffer(invoke_def_buffer);
        while (buffer.position + 1 < buffer.size()) {
          var class_id = character_category_definition.length;
          var is_always_invoke = buffer.get();
          var is_grouping = buffer.get();
          var max_length = buffer.getInt();
          var class_name = buffer.getString();
          character_category_definition.push(new CharacterClass(class_id, class_name, is_always_invoke, is_grouping, max_length));
        }
        invoke_def.init(character_category_definition);
        return invoke_def;
      };
      InvokeDefinitionMap.prototype.init = function(character_category_definition) {
        if (character_category_definition == null) {
          return;
        }
        for (var i = 0; i < character_category_definition.length; i++) {
          var character_class = character_category_definition[i];
          this.map[i] = character_class;
          this.lookup_table[character_class.class_name] = i;
        }
      };
      InvokeDefinitionMap.prototype.getCharacterClass = function(class_id) {
        return this.map[class_id];
      };
      InvokeDefinitionMap.prototype.lookup = function(class_name) {
        var class_id = this.lookup_table[class_name];
        if (class_id == null) {
          return null;
        }
        return class_id;
      };
      InvokeDefinitionMap.prototype.toBuffer = function() {
        var buffer = new ByteBuffer();
        for (var i = 0; i < this.map.length; i++) {
          var char_class = this.map[i];
          buffer.put(char_class.is_always_invoke);
          buffer.put(char_class.is_grouping);
          buffer.putInt(char_class.max_length);
          buffer.putString(char_class.class_name);
        }
        buffer.shrink();
        return buffer.buffer;
      };
      module.exports = InvokeDefinitionMap;
    }
  });

  // node_modules/kuromoji/src/dict/CharacterDefinition.js
  var require_CharacterDefinition = __commonJS({
    "node_modules/kuromoji/src/dict/CharacterDefinition.js"(exports, module) {
      "use strict";
      var InvokeDefinitionMap = require_InvokeDefinitionMap();
      var CharacterClass = require_CharacterClass();
      var SurrogateAwareString = require_SurrogateAwareString();
      var DEFAULT_CATEGORY = "DEFAULT";
      function CharacterDefinition() {
        this.character_category_map = new Uint8Array(65536);
        this.compatible_category_map = new Uint32Array(65536);
        this.invoke_definition_map = null;
      }
      CharacterDefinition.load = function(cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer) {
        var char_def = new CharacterDefinition();
        char_def.character_category_map = cat_map_buffer;
        char_def.compatible_category_map = compat_cat_map_buffer;
        char_def.invoke_definition_map = InvokeDefinitionMap.load(invoke_def_buffer);
        return char_def;
      };
      CharacterDefinition.parseCharCategory = function(class_id, parsed_category_def) {
        var category = parsed_category_def[1];
        var invoke = parseInt(parsed_category_def[2]);
        var grouping = parseInt(parsed_category_def[3]);
        var max_length = parseInt(parsed_category_def[4]);
        if (!isFinite(invoke) || invoke !== 0 && invoke !== 1) {
          console.log("char.def parse error. INVOKE is 0 or 1 in:" + invoke);
          return null;
        }
        if (!isFinite(grouping) || grouping !== 0 && grouping !== 1) {
          console.log("char.def parse error. GROUP is 0 or 1 in:" + grouping);
          return null;
        }
        if (!isFinite(max_length) || max_length < 0) {
          console.log("char.def parse error. LENGTH is 1 to n:" + max_length);
          return null;
        }
        var is_invoke = invoke === 1;
        var is_grouping = grouping === 1;
        return new CharacterClass(class_id, category, is_invoke, is_grouping, max_length);
      };
      CharacterDefinition.parseCategoryMapping = function(parsed_category_mapping) {
        var start = parseInt(parsed_category_mapping[1]);
        var default_category = parsed_category_mapping[2];
        var compatible_category = 3 < parsed_category_mapping.length ? parsed_category_mapping.slice(3) : [];
        if (!isFinite(start) || start < 0 || start > 65535) {
          console.log("char.def parse error. CODE is invalid:" + start);
        }
        return { start, default: default_category, compatible: compatible_category };
      };
      CharacterDefinition.parseRangeCategoryMapping = function(parsed_category_mapping) {
        var start = parseInt(parsed_category_mapping[1]);
        var end = parseInt(parsed_category_mapping[2]);
        var default_category = parsed_category_mapping[3];
        var compatible_category = 4 < parsed_category_mapping.length ? parsed_category_mapping.slice(4) : [];
        if (!isFinite(start) || start < 0 || start > 65535) {
          console.log("char.def parse error. CODE is invalid:" + start);
        }
        if (!isFinite(end) || end < 0 || end > 65535) {
          console.log("char.def parse error. CODE is invalid:" + end);
        }
        return { start, end, default: default_category, compatible: compatible_category };
      };
      CharacterDefinition.prototype.initCategoryMappings = function(category_mapping) {
        var code_point;
        if (category_mapping != null) {
          for (var i = 0; i < category_mapping.length; i++) {
            var mapping = category_mapping[i];
            var end = mapping.end || mapping.start;
            for (code_point = mapping.start; code_point <= end; code_point++) {
              this.character_category_map[code_point] = this.invoke_definition_map.lookup(mapping.default);
              for (var j = 0; j < mapping.compatible.length; j++) {
                var bitset = this.compatible_category_map[code_point];
                var compatible_category = mapping.compatible[j];
                if (compatible_category == null) {
                  continue;
                }
                var class_id = this.invoke_definition_map.lookup(compatible_category);
                if (class_id == null) {
                  continue;
                }
                var class_id_bit = 1 << class_id;
                bitset = bitset | class_id_bit;
                this.compatible_category_map[code_point] = bitset;
              }
            }
          }
        }
        var default_id = this.invoke_definition_map.lookup(DEFAULT_CATEGORY);
        if (default_id == null) {
          return;
        }
        for (code_point = 0; code_point < this.character_category_map.length; code_point++) {
          if (this.character_category_map[code_point] === 0) {
            this.character_category_map[code_point] = 1 << default_id;
          }
        }
      };
      CharacterDefinition.prototype.lookupCompatibleCategory = function(ch) {
        var classes = [];
        var code = ch.charCodeAt(0);
        var integer;
        if (code < this.compatible_category_map.length) {
          integer = this.compatible_category_map[code];
        }
        if (integer == null || integer === 0) {
          return classes;
        }
        for (var bit = 0; bit < 32; bit++) {
          if (integer << 31 - bit >>> 31 === 1) {
            var character_class = this.invoke_definition_map.getCharacterClass(bit);
            if (character_class == null) {
              continue;
            }
            classes.push(character_class);
          }
        }
        return classes;
      };
      CharacterDefinition.prototype.lookup = function(ch) {
        var class_id;
        var code = ch.charCodeAt(0);
        if (SurrogateAwareString.isSurrogatePair(ch)) {
          class_id = this.invoke_definition_map.lookup(DEFAULT_CATEGORY);
        } else if (code < this.character_category_map.length) {
          class_id = this.character_category_map[code];
        }
        if (class_id == null) {
          class_id = this.invoke_definition_map.lookup(DEFAULT_CATEGORY);
        }
        return this.invoke_definition_map.getCharacterClass(class_id);
      };
      module.exports = CharacterDefinition;
    }
  });

  // node_modules/kuromoji/src/dict/UnknownDictionary.js
  var require_UnknownDictionary = __commonJS({
    "node_modules/kuromoji/src/dict/UnknownDictionary.js"(exports, module) {
      "use strict";
      var TokenInfoDictionary = require_TokenInfoDictionary();
      var CharacterDefinition = require_CharacterDefinition();
      var ByteBuffer = require_ByteBuffer();
      function UnknownDictionary() {
        this.dictionary = new ByteBuffer(10 * 1024 * 1024);
        this.target_map = {};
        this.pos_buffer = new ByteBuffer(10 * 1024 * 1024);
        this.character_definition = null;
      }
      UnknownDictionary.prototype = Object.create(TokenInfoDictionary.prototype);
      UnknownDictionary.prototype.characterDefinition = function(character_definition) {
        this.character_definition = character_definition;
        return this;
      };
      UnknownDictionary.prototype.lookup = function(ch) {
        return this.character_definition.lookup(ch);
      };
      UnknownDictionary.prototype.lookupCompatibleCategory = function(ch) {
        return this.character_definition.lookupCompatibleCategory(ch);
      };
      UnknownDictionary.prototype.loadUnknownDictionaries = function(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer) {
        this.loadDictionary(unk_buffer);
        this.loadPosVector(unk_pos_buffer);
        this.loadTargetMap(unk_map_buffer);
        this.character_definition = CharacterDefinition.load(cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
      };
      module.exports = UnknownDictionary;
    }
  });

  // node_modules/kuromoji/src/dict/DynamicDictionaries.js
  var require_DynamicDictionaries = __commonJS({
    "node_modules/kuromoji/src/dict/DynamicDictionaries.js"(exports, module) {
      "use strict";
      var doublearray = require_doublearray();
      var TokenInfoDictionary = require_TokenInfoDictionary();
      var ConnectionCosts = require_ConnectionCosts();
      var UnknownDictionary = require_UnknownDictionary();
      function DynamicDictionaries2(trie, token_info_dictionary, connection_costs, unknown_dictionary) {
        if (trie != null) {
          this.trie = trie;
        } else {
          this.trie = doublearray.builder(0).build([
            { k: "", v: 1 }
          ]);
        }
        if (token_info_dictionary != null) {
          this.token_info_dictionary = token_info_dictionary;
        } else {
          this.token_info_dictionary = new TokenInfoDictionary();
        }
        if (connection_costs != null) {
          this.connection_costs = connection_costs;
        } else {
          this.connection_costs = new ConnectionCosts(0, 0);
        }
        if (unknown_dictionary != null) {
          this.unknown_dictionary = unknown_dictionary;
        } else {
          this.unknown_dictionary = new UnknownDictionary();
        }
      }
      DynamicDictionaries2.prototype.loadTrie = function(base_buffer, check_buffer) {
        this.trie = doublearray.load(base_buffer, check_buffer);
        return this;
      };
      DynamicDictionaries2.prototype.loadTokenInfoDictionaries = function(token_info_buffer, pos_buffer, target_map_buffer) {
        this.token_info_dictionary.loadDictionary(token_info_buffer);
        this.token_info_dictionary.loadPosVector(pos_buffer);
        this.token_info_dictionary.loadTargetMap(target_map_buffer);
        return this;
      };
      DynamicDictionaries2.prototype.loadConnectionCosts = function(cc_buffer) {
        this.connection_costs.loadConnectionCosts(cc_buffer);
        return this;
      };
      DynamicDictionaries2.prototype.loadUnknownDictionaries = function(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer) {
        this.unknown_dictionary.loadUnknownDictionaries(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
        return this;
      };
      module.exports = DynamicDictionaries2;
    }
  });

  // node_modules/zlibjs/bin/gunzip.min.js
  var require_gunzip_min = __commonJS({
    "node_modules/zlibjs/bin/gunzip.min.js"(exports) {
      (function() {
        "use strict";
        function n(e) {
          throw e;
        }
        var p = void 0, aa = this;
        function t(e, b) {
          var d = e.split("."), c = aa;
          !(d[0] in c) && c.execScript && c.execScript("var " + d[0]);
          for (var a; d.length && (a = d.shift()); ) !d.length && b !== p ? c[a] = b : c = c[a] ? c[a] : c[a] = {};
        }
        ;
        var x = "undefined" !== typeof Uint8Array && "undefined" !== typeof Uint16Array && "undefined" !== typeof Uint32Array && "undefined" !== typeof DataView;
        new (x ? Uint8Array : Array)(256);
        var y;
        for (y = 0; 256 > y; ++y) for (var A = y, ba = 7, A = A >>> 1; A; A >>>= 1) --ba;
        function B(e, b, d) {
          var c, a = "number" === typeof b ? b : b = 0, f = "number" === typeof d ? d : e.length;
          c = -1;
          for (a = f & 7; a--; ++b) c = c >>> 8 ^ C[(c ^ e[b]) & 255];
          for (a = f >> 3; a--; b += 8) c = c >>> 8 ^ C[(c ^ e[b]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 1]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 2]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 3]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 4]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 5]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 6]) & 255], c = c >>> 8 ^ C[(c ^ e[b + 7]) & 255];
          return (c ^ 4294967295) >>> 0;
        }
        var D = [
          0,
          1996959894,
          3993919788,
          2567524794,
          124634137,
          1886057615,
          3915621685,
          2657392035,
          249268274,
          2044508324,
          3772115230,
          2547177864,
          162941995,
          2125561021,
          3887607047,
          2428444049,
          498536548,
          1789927666,
          4089016648,
          2227061214,
          450548861,
          1843258603,
          4107580753,
          2211677639,
          325883990,
          1684777152,
          4251122042,
          2321926636,
          335633487,
          1661365465,
          4195302755,
          2366115317,
          997073096,
          1281953886,
          3579855332,
          2724688242,
          1006888145,
          1258607687,
          3524101629,
          2768942443,
          901097722,
          1119000684,
          3686517206,
          2898065728,
          853044451,
          1172266101,
          3705015759,
          2882616665,
          651767980,
          1373503546,
          3369554304,
          3218104598,
          565507253,
          1454621731,
          3485111705,
          3099436303,
          671266974,
          1594198024,
          3322730930,
          2970347812,
          795835527,
          1483230225,
          3244367275,
          3060149565,
          1994146192,
          31158534,
          2563907772,
          4023717930,
          1907459465,
          112637215,
          2680153253,
          3904427059,
          2013776290,
          251722036,
          2517215374,
          3775830040,
          2137656763,
          141376813,
          2439277719,
          3865271297,
          1802195444,
          476864866,
          2238001368,
          4066508878,
          1812370925,
          453092731,
          2181625025,
          4111451223,
          1706088902,
          314042704,
          2344532202,
          4240017532,
          1658658271,
          366619977,
          2362670323,
          4224994405,
          1303535960,
          984961486,
          2747007092,
          3569037538,
          1256170817,
          1037604311,
          2765210733,
          3554079995,
          1131014506,
          879679996,
          2909243462,
          3663771856,
          1141124467,
          855842277,
          2852801631,
          3708648649,
          1342533948,
          654459306,
          3188396048,
          3373015174,
          1466479909,
          544179635,
          3110523913,
          3462522015,
          1591671054,
          702138776,
          2966460450,
          3352799412,
          1504918807,
          783551873,
          3082640443,
          3233442989,
          3988292384,
          2596254646,
          62317068,
          1957810842,
          3939845945,
          2647816111,
          81470997,
          1943803523,
          3814918930,
          2489596804,
          225274430,
          2053790376,
          3826175755,
          2466906013,
          167816743,
          2097651377,
          4027552580,
          2265490386,
          503444072,
          1762050814,
          4150417245,
          2154129355,
          426522225,
          1852507879,
          4275313526,
          2312317920,
          282753626,
          1742555852,
          4189708143,
          2394877945,
          397917763,
          1622183637,
          3604390888,
          2714866558,
          953729732,
          1340076626,
          3518719985,
          2797360999,
          1068828381,
          1219638859,
          3624741850,
          2936675148,
          906185462,
          1090812512,
          3747672003,
          2825379669,
          829329135,
          1181335161,
          3412177804,
          3160834842,
          628085408,
          1382605366,
          3423369109,
          3138078467,
          570562233,
          1426400815,
          3317316542,
          2998733608,
          733239954,
          1555261956,
          3268935591,
          3050360625,
          752459403,
          1541320221,
          2607071920,
          3965973030,
          1969922972,
          40735498,
          2617837225,
          3943577151,
          1913087877,
          83908371,
          2512341634,
          3803740692,
          2075208622,
          213261112,
          2463272603,
          3855990285,
          2094854071,
          198958881,
          2262029012,
          4057260610,
          1759359992,
          534414190,
          2176718541,
          4139329115,
          1873836001,
          414664567,
          2282248934,
          4279200368,
          1711684554,
          285281116,
          2405801727,
          4167216745,
          1634467795,
          376229701,
          2685067896,
          3608007406,
          1308918612,
          956543938,
          2808555105,
          3495958263,
          1231636301,
          1047427035,
          2932959818,
          3654703836,
          1088359270,
          936918e3,
          2847714899,
          3736837829,
          1202900863,
          817233897,
          3183342108,
          3401237130,
          1404277552,
          615818150,
          3134207493,
          3453421203,
          1423857449,
          601450431,
          3009837614,
          3294710456,
          1567103746,
          711928724,
          3020668471,
          3272380065,
          1510334235,
          755167117
        ], C = x ? new Uint32Array(D) : D;
        function E() {
        }
        E.prototype.getName = function() {
          return this.name;
        };
        E.prototype.getData = function() {
          return this.data;
        };
        E.prototype.G = function() {
          return this.H;
        };
        function G(e) {
          var b = e.length, d = 0, c = Number.POSITIVE_INFINITY, a, f, k, l, m, r, q, g, h, v;
          for (g = 0; g < b; ++g) e[g] > d && (d = e[g]), e[g] < c && (c = e[g]);
          a = 1 << d;
          f = new (x ? Uint32Array : Array)(a);
          k = 1;
          l = 0;
          for (m = 2; k <= d; ) {
            for (g = 0; g < b; ++g) if (e[g] === k) {
              r = 0;
              q = l;
              for (h = 0; h < k; ++h) r = r << 1 | q & 1, q >>= 1;
              v = k << 16 | g;
              for (h = r; h < a; h += m) f[h] = v;
              ++l;
            }
            ++k;
            l <<= 1;
            m <<= 1;
          }
          return [f, d, c];
        }
        ;
        var J = [], K;
        for (K = 0; 288 > K; K++) switch (true) {
          case 143 >= K:
            J.push([K + 48, 8]);
            break;
          case 255 >= K:
            J.push([K - 144 + 400, 9]);
            break;
          case 279 >= K:
            J.push([K - 256 + 0, 7]);
            break;
          case 287 >= K:
            J.push([K - 280 + 192, 8]);
            break;
          default:
            n("invalid literal: " + K);
        }
        var ca = (function() {
          function e(a) {
            switch (true) {
              case 3 === a:
                return [257, a - 3, 0];
              case 4 === a:
                return [258, a - 4, 0];
              case 5 === a:
                return [259, a - 5, 0];
              case 6 === a:
                return [260, a - 6, 0];
              case 7 === a:
                return [261, a - 7, 0];
              case 8 === a:
                return [262, a - 8, 0];
              case 9 === a:
                return [263, a - 9, 0];
              case 10 === a:
                return [264, a - 10, 0];
              case 12 >= a:
                return [265, a - 11, 1];
              case 14 >= a:
                return [266, a - 13, 1];
              case 16 >= a:
                return [267, a - 15, 1];
              case 18 >= a:
                return [268, a - 17, 1];
              case 22 >= a:
                return [269, a - 19, 2];
              case 26 >= a:
                return [270, a - 23, 2];
              case 30 >= a:
                return [271, a - 27, 2];
              case 34 >= a:
                return [
                  272,
                  a - 31,
                  2
                ];
              case 42 >= a:
                return [273, a - 35, 3];
              case 50 >= a:
                return [274, a - 43, 3];
              case 58 >= a:
                return [275, a - 51, 3];
              case 66 >= a:
                return [276, a - 59, 3];
              case 82 >= a:
                return [277, a - 67, 4];
              case 98 >= a:
                return [278, a - 83, 4];
              case 114 >= a:
                return [279, a - 99, 4];
              case 130 >= a:
                return [280, a - 115, 4];
              case 162 >= a:
                return [281, a - 131, 5];
              case 194 >= a:
                return [282, a - 163, 5];
              case 226 >= a:
                return [283, a - 195, 5];
              case 257 >= a:
                return [284, a - 227, 5];
              case 258 === a:
                return [285, a - 258, 0];
              default:
                n("invalid length: " + a);
            }
          }
          var b = [], d, c;
          for (d = 3; 258 >= d; d++) c = e(d), b[d] = c[2] << 24 | c[1] << 16 | c[0];
          return b;
        })();
        x && new Uint32Array(ca);
        function L(e, b) {
          this.i = [];
          this.j = 32768;
          this.d = this.f = this.c = this.n = 0;
          this.input = x ? new Uint8Array(e) : e;
          this.o = false;
          this.k = M;
          this.w = false;
          if (b || !(b = {})) b.index && (this.c = b.index), b.bufferSize && (this.j = b.bufferSize), b.bufferType && (this.k = b.bufferType), b.resize && (this.w = b.resize);
          switch (this.k) {
            case N:
              this.a = 32768;
              this.b = new (x ? Uint8Array : Array)(32768 + this.j + 258);
              break;
            case M:
              this.a = 0;
              this.b = new (x ? Uint8Array : Array)(this.j);
              this.e = this.D;
              this.q = this.A;
              this.l = this.C;
              break;
            default:
              n(Error("invalid inflate mode"));
          }
        }
        var N = 0, M = 1;
        L.prototype.g = function() {
          for (; !this.o; ) {
            var e = P(this, 3);
            e & 1 && (this.o = true);
            e >>>= 1;
            switch (e) {
              case 0:
                var b = this.input, d = this.c, c = this.b, a = this.a, f = b.length, k = p, l = p, m = c.length, r = p;
                this.d = this.f = 0;
                d + 1 >= f && n(Error("invalid uncompressed block header: LEN"));
                k = b[d++] | b[d++] << 8;
                d + 1 >= f && n(Error("invalid uncompressed block header: NLEN"));
                l = b[d++] | b[d++] << 8;
                k === ~l && n(Error("invalid uncompressed block header: length verify"));
                d + k > b.length && n(Error("input buffer is broken"));
                switch (this.k) {
                  case N:
                    for (; a + k > c.length; ) {
                      r = m - a;
                      k -= r;
                      if (x) c.set(b.subarray(d, d + r), a), a += r, d += r;
                      else for (; r--; ) c[a++] = b[d++];
                      this.a = a;
                      c = this.e();
                      a = this.a;
                    }
                    break;
                  case M:
                    for (; a + k > c.length; ) c = this.e({ t: 2 });
                    break;
                  default:
                    n(Error("invalid inflate mode"));
                }
                if (x) c.set(b.subarray(d, d + k), a), a += k, d += k;
                else for (; k--; ) c[a++] = b[d++];
                this.c = d;
                this.a = a;
                this.b = c;
                break;
              case 1:
                this.l(da, ea);
                break;
              case 2:
                for (var q = P(this, 5) + 257, g = P(this, 5) + 1, h = P(this, 4) + 4, v = new (x ? Uint8Array : Array)(Q.length), s = p, F = p, H = p, w = p, z = p, O = p, I = p, u = p, Z = p, u = 0; u < h; ++u) v[Q[u]] = P(this, 3);
                if (!x) {
                  u = h;
                  for (h = v.length; u < h; ++u) v[Q[u]] = 0;
                }
                s = G(v);
                w = new (x ? Uint8Array : Array)(q + g);
                u = 0;
                for (Z = q + g; u < Z; ) switch (z = R(this, s), z) {
                  case 16:
                    for (I = 3 + P(this, 2); I--; ) w[u++] = O;
                    break;
                  case 17:
                    for (I = 3 + P(this, 3); I--; ) w[u++] = 0;
                    O = 0;
                    break;
                  case 18:
                    for (I = 11 + P(this, 7); I--; ) w[u++] = 0;
                    O = 0;
                    break;
                  default:
                    O = w[u++] = z;
                }
                F = x ? G(w.subarray(0, q)) : G(w.slice(0, q));
                H = x ? G(w.subarray(q)) : G(w.slice(q));
                this.l(F, H);
                break;
              default:
                n(Error("unknown BTYPE: " + e));
            }
          }
          return this.q();
        };
        var S = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], Q = x ? new Uint16Array(S) : S, fa = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 258, 258], ga = x ? new Uint16Array(fa) : fa, ha = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0], T = x ? new Uint8Array(ha) : ha, ia = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577], ja = x ? new Uint16Array(ia) : ia, ka = [
          0,
          0,
          0,
          0,
          1,
          1,
          2,
          2,
          3,
          3,
          4,
          4,
          5,
          5,
          6,
          6,
          7,
          7,
          8,
          8,
          9,
          9,
          10,
          10,
          11,
          11,
          12,
          12,
          13,
          13
        ], U = x ? new Uint8Array(ka) : ka, V = new (x ? Uint8Array : Array)(288), W, la;
        W = 0;
        for (la = V.length; W < la; ++W) V[W] = 143 >= W ? 8 : 255 >= W ? 9 : 279 >= W ? 7 : 8;
        var da = G(V), X = new (x ? Uint8Array : Array)(30), Y, ma;
        Y = 0;
        for (ma = X.length; Y < ma; ++Y) X[Y] = 5;
        var ea = G(X);
        function P(e, b) {
          for (var d = e.f, c = e.d, a = e.input, f = e.c, k = a.length, l; c < b; ) f >= k && n(Error("input buffer is broken")), d |= a[f++] << c, c += 8;
          l = d & (1 << b) - 1;
          e.f = d >>> b;
          e.d = c - b;
          e.c = f;
          return l;
        }
        function R(e, b) {
          for (var d = e.f, c = e.d, a = e.input, f = e.c, k = a.length, l = b[0], m = b[1], r, q; c < m && !(f >= k); ) d |= a[f++] << c, c += 8;
          r = l[d & (1 << m) - 1];
          q = r >>> 16;
          q > c && n(Error("invalid code length: " + q));
          e.f = d >> q;
          e.d = c - q;
          e.c = f;
          return r & 65535;
        }
        L.prototype.l = function(e, b) {
          var d = this.b, c = this.a;
          this.r = e;
          for (var a = d.length - 258, f, k, l, m; 256 !== (f = R(this, e)); ) if (256 > f) c >= a && (this.a = c, d = this.e(), c = this.a), d[c++] = f;
          else {
            k = f - 257;
            m = ga[k];
            0 < T[k] && (m += P(this, T[k]));
            f = R(this, b);
            l = ja[f];
            0 < U[f] && (l += P(this, U[f]));
            c >= a && (this.a = c, d = this.e(), c = this.a);
            for (; m--; ) d[c] = d[c++ - l];
          }
          for (; 8 <= this.d; ) this.d -= 8, this.c--;
          this.a = c;
        };
        L.prototype.C = function(e, b) {
          var d = this.b, c = this.a;
          this.r = e;
          for (var a = d.length, f, k, l, m; 256 !== (f = R(this, e)); ) if (256 > f) c >= a && (d = this.e(), a = d.length), d[c++] = f;
          else {
            k = f - 257;
            m = ga[k];
            0 < T[k] && (m += P(this, T[k]));
            f = R(this, b);
            l = ja[f];
            0 < U[f] && (l += P(this, U[f]));
            c + m > a && (d = this.e(), a = d.length);
            for (; m--; ) d[c] = d[c++ - l];
          }
          for (; 8 <= this.d; ) this.d -= 8, this.c--;
          this.a = c;
        };
        L.prototype.e = function() {
          var e = new (x ? Uint8Array : Array)(this.a - 32768), b = this.a - 32768, d, c, a = this.b;
          if (x) e.set(a.subarray(32768, e.length));
          else {
            d = 0;
            for (c = e.length; d < c; ++d) e[d] = a[d + 32768];
          }
          this.i.push(e);
          this.n += e.length;
          if (x) a.set(a.subarray(b, b + 32768));
          else for (d = 0; 32768 > d; ++d) a[d] = a[b + d];
          this.a = 32768;
          return a;
        };
        L.prototype.D = function(e) {
          var b, d = this.input.length / this.c + 1 | 0, c, a, f, k = this.input, l = this.b;
          e && ("number" === typeof e.t && (d = e.t), "number" === typeof e.z && (d += e.z));
          2 > d ? (c = (k.length - this.c) / this.r[2], f = 258 * (c / 2) | 0, a = f < l.length ? l.length + f : l.length << 1) : a = l.length * d;
          x ? (b = new Uint8Array(a), b.set(l)) : b = l;
          return this.b = b;
        };
        L.prototype.q = function() {
          var e = 0, b = this.b, d = this.i, c, a = new (x ? Uint8Array : Array)(this.n + (this.a - 32768)), f, k, l, m;
          if (0 === d.length) return x ? this.b.subarray(32768, this.a) : this.b.slice(32768, this.a);
          f = 0;
          for (k = d.length; f < k; ++f) {
            c = d[f];
            l = 0;
            for (m = c.length; l < m; ++l) a[e++] = c[l];
          }
          f = 32768;
          for (k = this.a; f < k; ++f) a[e++] = b[f];
          this.i = [];
          return this.buffer = a;
        };
        L.prototype.A = function() {
          var e, b = this.a;
          x ? this.w ? (e = new Uint8Array(b), e.set(this.b.subarray(0, b))) : e = this.b.subarray(0, b) : (this.b.length > b && (this.b.length = b), e = this.b);
          return this.buffer = e;
        };
        function $(e) {
          this.input = e;
          this.c = 0;
          this.m = [];
          this.s = false;
        }
        $.prototype.F = function() {
          this.s || this.g();
          return this.m.slice();
        };
        $.prototype.g = function() {
          for (var e = this.input.length; this.c < e; ) {
            var b = new E(), d = p, c = p, a = p, f = p, k = p, l = p, m = p, r = p, q = p, g = this.input, h = this.c;
            b.u = g[h++];
            b.v = g[h++];
            (31 !== b.u || 139 !== b.v) && n(Error("invalid file signature:" + b.u + "," + b.v));
            b.p = g[h++];
            switch (b.p) {
              case 8:
                break;
              default:
                n(Error("unknown compression method: " + b.p));
            }
            b.h = g[h++];
            r = g[h++] | g[h++] << 8 | g[h++] << 16 | g[h++] << 24;
            b.H = new Date(1e3 * r);
            b.N = g[h++];
            b.M = g[h++];
            0 < (b.h & 4) && (b.I = g[h++] | g[h++] << 8, h += b.I);
            if (0 < (b.h & 8)) {
              m = [];
              for (l = 0; 0 < (k = g[h++]); ) m[l++] = String.fromCharCode(k);
              b.name = m.join("");
            }
            if (0 < (b.h & 16)) {
              m = [];
              for (l = 0; 0 < (k = g[h++]); ) m[l++] = String.fromCharCode(k);
              b.J = m.join("");
            }
            0 < (b.h & 2) && (b.B = B(g, 0, h) & 65535, b.B !== (g[h++] | g[h++] << 8) && n(Error("invalid header crc16")));
            d = g[g.length - 4] | g[g.length - 3] << 8 | g[g.length - 2] << 16 | g[g.length - 1] << 24;
            g.length - h - 4 - 4 < 512 * d && (f = d);
            c = new L(g, { index: h, bufferSize: f });
            b.data = a = c.g();
            h = c.c;
            b.K = q = (g[h++] | g[h++] << 8 | g[h++] << 16 | g[h++] << 24) >>> 0;
            B(a, p, p) !== q && n(Error("invalid CRC-32 checksum: 0x" + B(a, p, p).toString(16) + " / 0x" + q.toString(16)));
            b.L = d = (g[h++] | g[h++] << 8 | g[h++] << 16 | g[h++] << 24) >>> 0;
            (a.length & 4294967295) !== d && n(Error("invalid input size: " + (a.length & 4294967295) + " / " + d));
            this.m.push(b);
            this.c = h;
          }
          this.s = true;
          var v = this.m, s, F, H = 0, w = 0, z;
          s = 0;
          for (F = v.length; s < F; ++s) w += v[s].data.length;
          if (x) {
            z = new Uint8Array(w);
            for (s = 0; s < F; ++s) z.set(v[s].data, H), H += v[s].data.length;
          } else {
            z = [];
            for (s = 0; s < F; ++s) z[s] = v[s].data;
            z = Array.prototype.concat.apply([], z);
          }
          return z;
        };
        t("Zlib.Gunzip", $);
        t("Zlib.Gunzip.prototype.decompress", $.prototype.g);
        t("Zlib.Gunzip.prototype.getMembers", $.prototype.F);
        t("Zlib.GunzipMember", E);
        t("Zlib.GunzipMember.prototype.getName", E.prototype.getName);
        t("Zlib.GunzipMember.prototype.getData", E.prototype.getData);
        t("Zlib.GunzipMember.prototype.getMtime", E.prototype.G);
      }).call(exports);
    }
  });

  // yomi-ruby:runtime-manifest
  var runtime_manifest_default = { "dictionary": [{ "name": "base.dat.gz", "resourceName": "yomi-ruby-dict-base", "size": 3956825, "sha256": "0803327762e1c93ca731e4319ab8343340f2806bb84941207782cde9d2d5a8eb" }, { "name": "cc.dat.gz", "resourceName": "yomi-ruby-dict-cc", "size": 1692067, "sha256": "02b7631be0d4de3a1a75cd9f9cc51536e4f94c9e6b389b813e06ba0f6e7de765" }, { "name": "check.dat.gz", "resourceName": "yomi-ruby-dict-check", "size": 3111633, "sha256": "193ae0035fff6fe812b58d9ee730e7a7d7ee601d918481ce51075c58114f6cc9" }, { "name": "tid.dat.gz", "resourceName": "yomi-ruby-dict-tid", "size": 1605820, "sha256": "d43d831cb6fb0f0a411739cd287a6d5e998e121a8daca614df14a81a0dcac586" }, { "name": "tid_map.dat.gz", "resourceName": "yomi-ruby-dict-tid-map", "size": 1485576, "sha256": "33efd5ffd87a70f669add093fa39dee44341d58f940844ef107c8fd98bb795b2" }, { "name": "tid_pos.dat.gz", "resourceName": "yomi-ruby-dict-tid-pos", "size": 5916009, "sha256": "60dbfc99a6ab993f30c5dab648bec6ad7f9aaefa5c14e1843837d95e509f8895" }, { "name": "unk.dat.gz", "resourceName": "yomi-ruby-dict-unk", "size": 10512, "sha256": "f7f991cdeb9bfd3e9c0e4577cc50ee0815a11c508cccd444a9d3ab3c81521100" }, { "name": "unk_char.dat.gz", "resourceName": "yomi-ruby-dict-unk-char", "size": 306, "sha256": "9a8e86fd9aff32d323fbb59f5a7006f05927a11f8173c90712cc56293aeb3225" }, { "name": "unk_compat.dat.gz", "resourceName": "yomi-ruby-dict-unk-compat", "size": 338, "sha256": "50f60aa29bc2e86c2903ab8c825bb6fa604d2b294d96941c1d3924259791899d" }, { "name": "unk_invoke.dat.gz", "resourceName": "yomi-ruby-dict-unk-invoke", "size": 1140, "sha256": "6b210889548457c3006913afd12c8b525562255f2709e404604be9614a25e94c" }, { "name": "unk_map.dat.gz", "resourceName": "yomi-ruby-dict-unk-map", "size": 1190, "sha256": "6df12460e5477230bb6fd9641def918b699fc0a8868016b6c9f794488630509b" }, { "name": "unk_pos.dat.gz", "resourceName": "yomi-ruby-dict-unk-pos", "size": 10540, "sha256": "5b183a29f281acc7e0542beca47b83f7985047c0a2d27e78a66f32276be5ad11" }] };

  // src/romanize.js
  var KANA = new Map(Object.entries({
    ア: "a",
    イ: "i",
    ウ: "u",
    エ: "e",
    オ: "o",
    カ: "ka",
    キ: "ki",
    ク: "ku",
    ケ: "ke",
    コ: "ko",
    ガ: "ga",
    ギ: "gi",
    グ: "gu",
    ゲ: "ge",
    ゴ: "go",
    サ: "sa",
    シ: "shi",
    ス: "su",
    セ: "se",
    ソ: "so",
    ザ: "za",
    ジ: "ji",
    ズ: "zu",
    ゼ: "ze",
    ゾ: "zo",
    タ: "ta",
    チ: "chi",
    ツ: "tsu",
    テ: "te",
    ト: "to",
    ダ: "da",
    ヂ: "ji",
    ヅ: "zu",
    デ: "de",
    ド: "do",
    ナ: "na",
    ニ: "ni",
    ヌ: "nu",
    ネ: "ne",
    ノ: "no",
    ハ: "ha",
    ヒ: "hi",
    フ: "fu",
    ヘ: "he",
    ホ: "ho",
    バ: "ba",
    ビ: "bi",
    ブ: "bu",
    ベ: "be",
    ボ: "bo",
    パ: "pa",
    ピ: "pi",
    プ: "pu",
    ペ: "pe",
    ポ: "po",
    マ: "ma",
    ミ: "mi",
    ム: "mu",
    メ: "me",
    モ: "mo",
    ヤ: "ya",
    ユ: "yu",
    ヨ: "yo",
    ラ: "ra",
    リ: "ri",
    ル: "ru",
    レ: "re",
    ロ: "ro",
    ワ: "wa",
    ヰ: "wi",
    ヱ: "we",
    ヲ: "o",
    ン: "n",
    ァ: "a",
    ィ: "i",
    ゥ: "u",
    ェ: "e",
    ォ: "o",
    ヵ: "ka",
    ヶ: "ke",
    キャ: "kya",
    キュ: "kyu",
    キョ: "kyo",
    ギャ: "gya",
    ギュ: "gyu",
    ギョ: "gyo",
    シャ: "sha",
    シュ: "shu",
    ショ: "sho",
    シェ: "she",
    ジャ: "ja",
    ジュ: "ju",
    ジョ: "jo",
    ジェ: "je",
    チャ: "cha",
    チュ: "chu",
    チョ: "cho",
    チェ: "che",
    ニャ: "nya",
    ニュ: "nyu",
    ニョ: "nyo",
    ヒャ: "hya",
    ヒュ: "hyu",
    ヒョ: "hyo",
    ビャ: "bya",
    ビュ: "byu",
    ビョ: "byo",
    ピャ: "pya",
    ピュ: "pyu",
    ピョ: "pyo",
    ミャ: "mya",
    ミュ: "myu",
    ミョ: "myo",
    リャ: "rya",
    リュ: "ryu",
    リョ: "ryo",
    イェ: "ye",
    ウィ: "wi",
    ウェ: "we",
    ウォ: "wo",
    クァ: "kwa",
    クィ: "kwi",
    クェ: "kwe",
    クォ: "kwo",
    グァ: "gwa",
    グィ: "gwi",
    グェ: "gwe",
    グォ: "gwo",
    スィ: "si",
    ズィ: "zi",
    ティ: "ti",
    トゥ: "tu",
    ディ: "di",
    ドゥ: "du",
    テュ: "tyu",
    デュ: "dyu",
    ツァ: "tsa",
    ツィ: "tsi",
    ツェ: "tse",
    ツォ: "tso",
    ファ: "fa",
    フィ: "fi",
    フェ: "fe",
    フォ: "fo",
    フュ: "fyu",
    ヴ: "vu",
    ヴァ: "va",
    ヴィ: "vi",
    ヴェ: "ve",
    ヴォ: "vo",
    ヴュ: "vyu"
  }));
  var MACRON = { a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" };
  var KANA_ONLY = /^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fd\u30feー・\s]+$/u;
  function kanaToHepburn(reading, context = {}) {
    if (typeof reading !== "string" || reading.length === 0 || !KANA_ONLY.test(reading)) {
      return null;
    }
    const katakana = [...reading].map(toKatakana).join("");
    const pieces = [];
    let geminate = false;
    for (let index = 0; index < katakana.length; index += 1) {
      const character = katakana[index];
      if (/\s/u.test(character)) {
        pieces.push(character);
        continue;
      }
      if (character === "・") {
        pieces.push("-");
        continue;
      }
      if (character === "ッ") {
        geminate = true;
        continue;
      }
      if (character === "ー") {
        lengthenLastVowel(pieces);
        continue;
      }
      const pair = katakana.slice(index, index + 2);
      let piece = KANA.get(pair);
      if (piece != null) {
        index += 1;
      } else {
        piece = KANA.get(character);
      }
      if (piece == null) {
        return null;
      }
      if (pieces.at(-1) === "n" && /^[aeiouy]/u.test(piece)) {
        pieces.push("'");
      }
      if (geminate) {
        const prefix = piece.startsWith("ch") ? "t" : piece.match(/^[bcdfghjklmpqrstvwxyz]/u)?.[0];
        if (prefix) {
          pieces.push(prefix);
        }
        geminate = false;
      }
      pieces.push(piece);
    }
    if (geminate) {
      return null;
    }
    return applyLongVowels(pieces.join(""), context);
  }
  function toKatakana(character) {
    const code = character.codePointAt(0);
    if (code >= 12353 && code <= 12438) {
      return String.fromCodePoint(code + 96);
    }
    return character;
  }
  function lengthenLastVowel(pieces) {
    const value = pieces.join("");
    const match = value.match(/[aeiou](?!.*[aeiou])/u);
    if (!match) {
      return;
    }
    const vowel = match[0];
    for (let index = pieces.length - 1; index >= 0; index -= 1) {
      const position = pieces[index].lastIndexOf(vowel);
      if (position >= 0) {
        pieces[index] = `${pieces[index].slice(0, position)}${MACRON[vowel]}${pieces[index].slice(position + 1)}`;
        return;
      }
    }
  }
  function applyLongVowels(value, { surface = "", partOfSpeech = "" } = {}) {
    const protectVerbEnding = partOfSpeech === "動詞" && /う$/u.test(surface);
    let output = "";
    for (let index = 0; index < value.length; index += 1) {
      const current = value[index];
      const next = value[index + 1];
      const isProtectedOu = protectVerbEnding && current === "o" && next === "u" && index + 2 === value.length;
      if (!isProtectedOu && current === "o" && (next === "o" || next === "u")) {
        output += "ō";
        index += 1;
      } else if (current === next && "aue".includes(current)) {
        output += MACRON[current];
        index += 1;
      } else {
        output += current;
      }
    }
    return output;
  }

  // src/analyzer.js
  var HAS_KANJI = new RegExp("\\p{Script=Han}", "u");
  var KANA_READING = /^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fd\u30feー・\s]+$/u;
  function createAnalyzer(tokenizer) {
    if (typeof tokenizer?.tokenize !== "function") {
      throw new TypeError("A Kuromoji-compatible tokenizer is required.");
    }
    return (text) => segmentsFromTokens(text, tokenizer.tokenize(text));
  }
  function segmentsFromTokens(text, tokens) {
    if (typeof text !== "string" || !Array.isArray(tokens) || text.length === 0) {
      return text ? [{ type: "text", text }] : [];
    }
    const offsets = codePointOffsets(text);
    if (!positionsMatchSource(text, tokens, offsets)) {
      return [{ type: "text", text }];
    }
    const segments = [];
    let cursor = 0;
    for (const token of tokens) {
      const start = offsets[token.word_position - 1];
      appendText(segments, text.slice(cursor, start));
      const surface = token.surface_form;
      if (isReliableKanjiToken(token)) {
        const romaji = kanaToHepburn(token.reading, {
          surface,
          partOfSpeech: token.pos
        });
        if (romaji) {
          segments.push({ type: "annotation", surface, reading: token.reading, romaji });
        } else {
          appendText(segments, surface);
        }
      } else {
        appendText(segments, surface);
      }
      cursor = start + surface.length;
    }
    appendText(segments, text.slice(cursor));
    return segments;
  }
  function isReliableKanjiToken(token) {
    return Boolean(
      token && token.word_type === "KNOWN" && typeof token.surface_form === "string" && HAS_KANJI.test(token.surface_form) && typeof token.reading === "string" && KANA_READING.test(token.reading)
    );
  }
  function positionsMatchSource(text, tokens, offsets) {
    let cursor = 0;
    for (const token of tokens) {
      const codePointIndex = Number(token?.word_position) - 1;
      const start = offsets[codePointIndex];
      const surface = token?.surface_form;
      if (!Number.isInteger(codePointIndex) || !Number.isInteger(start) || start < cursor || typeof surface !== "string") {
        return false;
      }
      if (text.slice(start, start + surface.length) !== surface) {
        return false;
      }
      cursor = start + surface.length;
    }
    return true;
  }
  function codePointOffsets(text) {
    const offsets = [0];
    let codeUnitOffset = 0;
    for (const character of text) {
      codeUnitOffset += character.length;
      offsets.push(codeUnitOffset);
    }
    return offsets;
  }
  function appendText(segments, text) {
    if (!text) {
      return;
    }
    const last = segments.at(-1);
    if (last?.type === "text") {
      last.text += text;
    } else {
      segments.push({ type: "text", text });
    }
  }

  // src/bing-kanji-romaji.js
  var INITIAL_URL = "https://www.bing.com/translator";
  var ALLOWED_HOSTS = /* @__PURE__ */ new Set(["www.bing.com", "cn.bing.com"]);
  var HAS_KANJI2 = new RegExp("\\p{Script=Han}", "u");
  var SAFE_ROMAJI = /^[A-Za-zĀĪŪĒŌāīūēō'’-]+$/u;
  var MAX_GLOBAL_OBJECT_CHARACTERS = 16384;
  var MAX_ROMAJI_CHARACTERS = 1e3;
  function createBingKanjiRomajiClient({
    gmRequest,
    DOMParser = globalThis.DOMParser,
    now = Date.now,
    sleep = wait,
    maxPhrasesPerRequest = 50,
    maxEncodedTextLength = 1800,
    minimumIntervalMs = 250,
    requestTimeoutMs = 8e3,
    refreshSkewMs = 6e4,
    maxWordCharacters = 200
  }) {
    if (typeof gmRequest !== "function") {
      throw new TypeError("A GM_xmlhttpRequest adapter is required for Bing kanji romaji.");
    }
    if (typeof DOMParser !== "function") {
      throw new TypeError("A DOMParser is required for Bing translator initialization.");
    }
    if (!Number.isInteger(maxPhrasesPerRequest) || maxPhrasesPerRequest < 1) {
      throw new TypeError("maxPhrasesPerRequest must be a positive integer.");
    }
    if (!Number.isInteger(maxEncodedTextLength) || maxEncodedTextLength < 1) {
      throw new TypeError("maxEncodedTextLength must be a positive integer.");
    }
    let config = null;
    let configPromise = null;
    let operationQueue = Promise.resolve();
    let requestSequence = 0;
    let lastBatchStartedAt = null;
    const romanizeWords = (words, { signal } = {}) => {
      const operation = operationQueue.then(async () => {
        throwIfAborted(signal);
        const uniqueWords = [...new Set(words.filter((word) => isEligibleWord(
          word,
          maxWordCharacters
        )))];
        const readings = /* @__PURE__ */ new Map();
        const batches = buildBatches(uniqueWords, {
          maxPhrasesPerRequest,
          maxEncodedTextLength
        });
        for (const batch of batches) {
          const romanizedBatch = await romanizeBatch(batch, signal);
          for (const [word, romaji] of romanizedBatch) {
            readings.set(word, romaji);
          }
        }
        return readings;
      });
      operationQueue = operation.catch(() => {
      });
      return operation;
    };
    async function getConfig(signal) {
      if (config && now() < config.expiresAt - config.refreshSkew) {
        return config;
      }
      if (!configPromise) {
        configPromise = loadConfig(signal).then((loaded) => {
          config = loaded;
          return loaded;
        }).finally(() => {
          configPromise = null;
        });
      }
      return configPromise;
    }
    async function loadConfig(signal) {
      const response = await request(gmRequest, {
        method: "GET",
        url: INITIAL_URL,
        timeout: requestTimeoutMs,
        anonymous: true,
        redirect: "follow"
      }, { signal, label: "Bing translator initialization" });
      const finalUrl = validateTranslatorUrl(response.finalUrl ?? response.responseURL);
      const parsed = parseConfig(response.responseText, DOMParser);
      const refreshSkew = Math.min(refreshSkewMs, Math.floor(parsed.expiryIntervalMs / 10));
      return {
        ...parsed,
        origin: finalUrl.origin,
        pageUrl: finalUrl.href,
        expiresAt: now() + parsed.expiryIntervalMs,
        refreshSkew
      };
    }
    async function waitForTrafficSlot(signal) {
      if (lastBatchStartedAt == null || minimumIntervalMs <= 0) {
        return;
      }
      const remaining = minimumIntervalMs - (now() - lastBatchStartedAt);
      if (remaining > 0) {
        await sleep(remaining, { signal });
      }
    }
    async function romanizeBatch(words, signal) {
      let activeConfig = await getConfig(signal);
      await waitForTrafficSlot(signal);
      try {
        return await requestBatch(activeConfig, words, signal);
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 401 || signal?.aborted) {
          throw error;
        }
        config = null;
        activeConfig = await getConfig(signal);
        await waitForTrafficSlot(signal);
        try {
          return await requestBatch(activeConfig, words, signal);
        } catch (retryError) {
          if (retryError instanceof HttpError && retryError.status === 401) {
            config = null;
          }
          throw retryError;
        }
      }
    }
    async function requestBatch(activeConfig, words, signal) {
      throwIfAborted(signal);
      lastBatchStartedAt = now();
      const url = new URL("/ttranslatev3", activeConfig.origin);
      url.searchParams.set("isVertical", "1");
      url.searchParams.set("IG", activeConfig.ig);
      url.searchParams.set("IID", activeConfig.iid);
      url.searchParams.set("SFX", String(++requestSequence));
      url.searchParams.set("ref", "TThis");
      url.searchParams.set("edgepdftranslator", "1");
      const data = new URLSearchParams({
        fromLang: "ja",
        to: "ja",
        text: words.join("\n"),
        token: activeConfig.token,
        key: String(activeConfig.key),
        tryFetchingGenderDebiasedTranslations: "true"
      });
      const response = await request(gmRequest, {
        method: "POST",
        url: url.href,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Referer: activeConfig.pageUrl
        },
        data: data.toString(),
        timeout: requestTimeoutMs,
        anonymous: true,
        redirect: "error"
      }, { signal, label: "Bing kanji romaji" });
      validateResponseUrl(response.finalUrl ?? response.responseURL, url);
      return parseRomajiResponse(response.responseText, words);
    }
    return { romanizeWords };
  }
  function parseRomajiResponse(responseText, words) {
    const empty = /* @__PURE__ */ new Map();
    if (typeof responseText !== "string" || responseText.includes("ShowCaptcha")) {
      return empty;
    }
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      return empty;
    }
    if (!Array.isArray(payload) || payload.length !== 2) {
      return empty;
    }
    const result = payload[0];
    const metadata = payload[1];
    if (!Array.isArray(result?.translations) || result.translations.length !== 1) {
      return empty;
    }
    const translation = result.translations[0];
    if (typeof translation?.text !== "string" || translation.to !== "ja") {
      return empty;
    }
    if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
      return empty;
    }
    const keys = Object.keys(metadata).sort();
    if (keys.length !== 2 || keys[0] !== "inputTransliteration" || keys[1] !== "script") {
      return empty;
    }
    if (metadata.script !== "Latn" || typeof metadata.inputTransliteration !== "string") {
      return empty;
    }
    const echoedLines = translation.text.split(/\r?\n/u);
    const romajiLines = metadata.inputTransliteration.split(/\r?\n/u);
    if (echoedLines.length !== words.length || romajiLines.length !== words.length) {
      return empty;
    }
    const readings = /* @__PURE__ */ new Map();
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      if (echoedLines[index].trim() !== word) {
        return empty;
      }
      const romaji = romajiLines[index].trim();
      if (isSafeRomaji(romaji)) {
        readings.set(word, romaji);
      }
    }
    return readings;
  }
  function isSafeRomaji(romaji) {
    return typeof romaji === "string" && romaji.length > 0 && romaji.length <= MAX_ROMAJI_CHARACTERS && SAFE_ROMAJI.test(romaji);
  }
  function buildBatches(words, { maxPhrasesPerRequest, maxEncodedTextLength }) {
    const batches = [];
    let batch = [];
    for (const word of words) {
      if (encodedTextLength([word]) > maxEncodedTextLength) {
        continue;
      }
      const candidate = [...batch, word];
      if (batch.length > 0 && (candidate.length > maxPhrasesPerRequest || encodedTextLength(candidate) > maxEncodedTextLength)) {
        batches.push(batch);
        batch = [];
      }
      batch.push(word);
    }
    if (batch.length > 0) {
      batches.push(batch);
    }
    return batches;
  }
  function encodedTextLength(words) {
    return encodeURIComponent(words.join("\n")).length;
  }
  function validateTranslatorUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Bing translator initialization returned no valid final URL.");
    }
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname) || url.pathname !== "/translator" && url.pathname !== "/translator/" || url.username || url.password || url.port) {
      throw new Error("Bing translator initialization redirected outside the approved hosts or path.");
    }
    url.hash = "";
    url.search = "";
    return url;
  }
  function parseConfig(html, DOMParser) {
    if (typeof html !== "string" || html.length === 0 || html.length > 2e6) {
      throw new Error("Bing translator initialization returned invalid HTML.");
    }
    const document2 = new DOMParser().parseFromString(html, "text/html");
    const richContainers = document2.querySelectorAll("#rich_tta[data-iid]");
    if (richContainers.length !== 1) {
      throw new Error("Bing translator initialization returned an ambiguous translation container.");
    }
    const iid = richContainers[0].getAttribute("data-iid")?.trim() ?? "";
    if (!/^translator\.\d{1,12}$/u.test(iid)) {
      throw new Error("Bing translator initialization returned an invalid IID.");
    }
    const scriptText = [...document2.scripts].map((script) => script.textContent ?? "").join("\n");
    const directIgValues = collectMatches(
      scriptText,
      /window\._G\.IG\s*=\s*["']([A-Za-z0-9_-]{8,128})["']/gu
    );
    const objectIgValues = collectObjectInitializerIgValues(scriptText);
    const igValues = [...directIgValues, ...objectIgValues];
    const helperValues = collectMatches(
      scriptText,
      /params_AbusePreventionHelper\s*=\s*(\[[^;\r\n]{1,4096}\])/gu
    );
    if (igValues.length !== 1 || helperValues.length !== 1) {
      throw new Error("Bing translator initialization returned missing or ambiguous configuration.");
    }
    let helper;
    try {
      helper = JSON.parse(helperValues[0]);
    } catch {
      throw new Error("Bing translator initialization returned malformed abuse-prevention configuration.");
    }
    if (!Array.isArray(helper) || helper.length !== 3) {
      throw new Error("Bing translator initialization returned invalid abuse-prevention configuration.");
    }
    const [key, token, expiryIntervalMs] = helper;
    if (!Number.isSafeInteger(key) || key <= 0 || typeof token !== "string" || token.length === 0 || token.length > 2048 || !Number.isSafeInteger(expiryIntervalMs) || expiryIntervalMs <= 0 || expiryIntervalMs > 864e5) {
      throw new Error("Bing translator initialization returned invalid temporary credentials.");
    }
    return { ig: igValues[0], iid, key, token, expiryIntervalMs };
  }
  function validateResponseUrl(value, requestedUrl) {
    let finalUrl;
    try {
      finalUrl = new URL(value);
    } catch {
      throw new Error("Bing kanji romaji returned no valid final URL.");
    }
    if (finalUrl.href !== requestedUrl.href) {
      throw new Error("Bing kanji romaji redirected away from the approved request URL.");
    }
  }
  function collectMatches(text, pattern) {
    return [...text.matchAll(pattern)].map((match) => match[1]);
  }
  function collectObjectInitializerIgValues(scriptText) {
    const objectBodies = collectMatches(
      scriptText,
      new RegExp(
        String.raw`(?:^|[;\r\n])\s*(?:var\s+)?(?:window\.)?_G\s*=\s*\{([^;\r\n]{1,${MAX_GLOBAL_OBJECT_CHARACTERS}})\}\s*;`,
        "gu"
      )
    );
    return objectBodies.flatMap((body) => collectMatches(
      body,
      /(?:^|,)\s*IG\s*:\s*["']([A-Za-z0-9_-]{8,128})["'](?=\s*(?:,|$))/gu
    ));
  }
  function isEligibleWord(word, maxWordCharacters) {
    return typeof word === "string" && word.length > 0 && word.length <= maxWordCharacters && word === word.trim() && !/[\r\n\u0000-\u001f\u007f]/u.test(word) && HAS_KANJI2.test(word);
  }
  function request(gmRequest, options, { signal, label }) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      let settled = false;
      let handle;
      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        callback(value);
      };
      const onAbort = () => {
        handle?.abort?.();
        finish(reject, abortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      handle = gmRequest({
        ...options,
        onload(response) {
          if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
            const status = Number.isInteger(response?.status) ? response.status : "unknown";
            finish(reject, new HttpError(`${label} returned HTTP ${status}.`, response?.status));
            return;
          }
          finish(resolve, response ?? {});
        },
        onerror(response) {
          finish(reject, new Error(response?.statusText || `${label} request failed.`));
        },
        ontimeout() {
          finish(reject, new Error(`${label} request timed out.`));
        },
        onabort() {
          finish(reject, abortError());
        }
      });
    });
  }
  var HttpError = class extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  };
  function throwIfAborted(signal) {
    if (signal?.aborted) {
      throw abortError();
    }
  }
  function abortError() {
    return new DOMException("Bing kanji romaji was aborted.", "AbortError");
  }
  function wait(milliseconds, { signal } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      const timer = setTimeout(finish, milliseconds);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(abortError());
      };
      function finish() {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  // src/katakana.js
  var KATAKANA_PHRASE = /[\u30A1-\u30FA\u30FD-\u30FF][\u3099\u309A\u30A1-\u30FF]*[\u3099\u309A\u30A1-\u30FA\u30FC-\u30FF]|[\uFF66-\uFF6F\uFF71-\uFF9D][\uFF65-\uFF9F]*[\uFF66-\uFF9F]/gu;
  function findKatakanaMatches(text) {
    if (typeof text !== "string" || text.length === 0) {
      return [];
    }
    return [...text.matchAll(KATAKANA_PHRASE)].map((match) => ({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0]
    }));
  }

  // src/bing-translation.js
  var INITIAL_URL2 = "https://www.bing.com/translator";
  var ALLOWED_HOSTS2 = /* @__PURE__ */ new Set(["www.bing.com", "cn.bing.com"]);
  var LATIN_LETTER = new RegExp("\\p{Script=Latin}", "u");
  var MAX_GLOBAL_OBJECT_CHARACTERS2 = 16384;
  var MAX_TRANSLITERATION_CHARACTERS = 1e3;
  function createBingTranslationClient({
    gmRequest,
    DOMParser = globalThis.DOMParser,
    now = Date.now,
    sleep = wait2,
    maxPhrasesPerRequest = 50,
    maxEncodedTextLength = 1800,
    minimumIntervalMs = 250,
    requestTimeoutMs = 8e3,
    refreshSkewMs = 6e4,
    maxPhraseCharacters = 200
  }) {
    if (typeof gmRequest !== "function") {
      throw new TypeError("A GM_xmlhttpRequest adapter is required for Bing translation.");
    }
    if (typeof DOMParser !== "function") {
      throw new TypeError("A DOMParser is required for Bing translator initialization.");
    }
    if (!Number.isInteger(maxPhrasesPerRequest) || maxPhrasesPerRequest < 1) {
      throw new TypeError("maxPhrasesPerRequest must be a positive integer.");
    }
    if (!Number.isInteger(maxEncodedTextLength) || maxEncodedTextLength < 1) {
      throw new TypeError("maxEncodedTextLength must be a positive integer.");
    }
    let config = null;
    let configPromise = null;
    let operationQueue = Promise.resolve();
    let requestSequence = 0;
    let lastBatchStartedAt = null;
    const translatePhrases = (phrases, { signal } = {}) => {
      const operation = operationQueue.then(async () => {
        throwIfAborted2(signal);
        const uniquePhrases = [...new Set(phrases.filter((phrase) => isEligiblePhrase(
          phrase,
          maxPhraseCharacters
        )))];
        const translations = /* @__PURE__ */ new Map();
        const batches = buildBatches2(uniquePhrases, {
          maxPhrasesPerRequest,
          maxEncodedTextLength
        });
        for (const batch of batches) {
          const translatedBatch = await translateBatch(batch, signal);
          for (const [phrase, translated] of translatedBatch) {
            translations.set(phrase, translated);
          }
        }
        return translations;
      });
      operationQueue = operation.catch(() => {
      });
      return operation;
    };
    async function getConfig(signal) {
      if (config && now() < config.expiresAt - config.refreshSkew) {
        return config;
      }
      if (!configPromise) {
        configPromise = loadConfig(signal).then((loaded) => {
          config = loaded;
          return loaded;
        }).finally(() => {
          configPromise = null;
        });
      }
      return configPromise;
    }
    async function loadConfig(signal) {
      const response = await request2(gmRequest, {
        method: "GET",
        url: INITIAL_URL2,
        timeout: requestTimeoutMs,
        anonymous: true,
        redirect: "follow"
      }, { signal, label: "Bing translator initialization" });
      const finalUrl = validateTranslatorUrl2(response.finalUrl ?? response.responseURL);
      const parsed = parseConfig2(response.responseText, DOMParser);
      const refreshSkew = Math.min(refreshSkewMs, Math.floor(parsed.expiryIntervalMs / 10));
      return {
        ...parsed,
        origin: finalUrl.origin,
        pageUrl: finalUrl.href,
        expiresAt: now() + parsed.expiryIntervalMs,
        refreshSkew
      };
    }
    async function waitForTrafficSlot(signal) {
      if (lastBatchStartedAt == null || minimumIntervalMs <= 0) {
        return;
      }
      const remaining = minimumIntervalMs - (now() - lastBatchStartedAt);
      if (remaining > 0) {
        await sleep(remaining, { signal });
      }
    }
    async function translateBatch(phrases, signal) {
      let activeConfig = await getConfig(signal);
      await waitForTrafficSlot(signal);
      try {
        return await requestBatch(activeConfig, phrases, signal);
      } catch (error) {
        if (!(error instanceof HttpError2) || error.status !== 401 || signal?.aborted) {
          throw error;
        }
        config = null;
        activeConfig = await getConfig(signal);
        await waitForTrafficSlot(signal);
        try {
          return await requestBatch(activeConfig, phrases, signal);
        } catch (retryError) {
          if (retryError instanceof HttpError2 && retryError.status === 401) {
            config = null;
          }
          throw retryError;
        }
      }
    }
    async function requestBatch(activeConfig, phrases, signal) {
      throwIfAborted2(signal);
      lastBatchStartedAt = now();
      const url = new URL("/ttranslatev3", activeConfig.origin);
      url.searchParams.set("isVertical", "1");
      url.searchParams.set("IG", activeConfig.ig);
      url.searchParams.set("IID", activeConfig.iid);
      url.searchParams.set("SFX", String(++requestSequence));
      url.searchParams.set("ref", "TThis");
      url.searchParams.set("edgepdftranslator", "1");
      const data = new URLSearchParams({
        fromLang: "ja",
        to: "en",
        text: phrases.join("\n"),
        token: activeConfig.token,
        key: String(activeConfig.key),
        tryFetchingGenderDebiasedTranslations: "true"
      });
      const response = await request2(gmRequest, {
        method: "POST",
        url: url.href,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Referer: activeConfig.pageUrl
        },
        data: data.toString(),
        timeout: requestTimeoutMs,
        anonymous: true,
        redirect: "error"
      }, { signal, label: "Bing translation" });
      validateTranslationResponseUrl(response.finalUrl ?? response.responseURL, url);
      return parseTranslations(response.responseText, phrases);
    }
    return { translatePhrases };
  }
  function validateTranslatorUrl2(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Bing translator initialization returned no valid final URL.");
    }
    if (url.protocol !== "https:" || !ALLOWED_HOSTS2.has(url.hostname) || url.pathname !== "/translator" && url.pathname !== "/translator/" || url.username || url.password || url.port) {
      throw new Error("Bing translator initialization redirected outside the approved hosts or path.");
    }
    url.hash = "";
    url.search = "";
    return url;
  }
  function parseConfig2(html, DOMParser) {
    if (typeof html !== "string" || html.length === 0 || html.length > 2e6) {
      throw new Error("Bing translator initialization returned invalid HTML.");
    }
    const document2 = new DOMParser().parseFromString(html, "text/html");
    const richContainers = document2.querySelectorAll("#rich_tta[data-iid]");
    if (richContainers.length !== 1) {
      throw new Error("Bing translator initialization returned an ambiguous translation container.");
    }
    const iid = richContainers[0].getAttribute("data-iid")?.trim() ?? "";
    if (!/^translator\.\d{1,12}$/u.test(iid)) {
      throw new Error("Bing translator initialization returned an invalid IID.");
    }
    const scriptText = [...document2.scripts].map((script) => script.textContent ?? "").join("\n");
    const directIgValues = collectMatches2(
      scriptText,
      /window\._G\.IG\s*=\s*["']([A-Za-z0-9_-]{8,128})["']/gu
    );
    const objectIgValues = collectObjectInitializerIgValues2(scriptText);
    const igValues = [...directIgValues, ...objectIgValues];
    const helperValues = collectMatches2(
      scriptText,
      /params_AbusePreventionHelper\s*=\s*(\[[^;\r\n]{1,4096}\])/gu
    );
    if (igValues.length !== 1 || helperValues.length !== 1) {
      throw new Error("Bing translator initialization returned missing or ambiguous configuration.");
    }
    let helper;
    try {
      helper = JSON.parse(helperValues[0]);
    } catch {
      throw new Error("Bing translator initialization returned malformed abuse-prevention configuration.");
    }
    if (!Array.isArray(helper) || helper.length !== 3) {
      throw new Error("Bing translator initialization returned invalid abuse-prevention configuration.");
    }
    const [key, token, expiryIntervalMs] = helper;
    if (!Number.isSafeInteger(key) || key <= 0 || typeof token !== "string" || token.length === 0 || token.length > 2048 || !Number.isSafeInteger(expiryIntervalMs) || expiryIntervalMs <= 0 || expiryIntervalMs > 864e5) {
      throw new Error("Bing translator initialization returned invalid temporary credentials.");
    }
    return { ig: igValues[0], iid, key, token, expiryIntervalMs };
  }
  function validateTranslationResponseUrl(value, requestedUrl) {
    let finalUrl;
    try {
      finalUrl = new URL(value);
    } catch {
      throw new Error("Bing translation returned no valid final URL.");
    }
    if (finalUrl.href !== requestedUrl.href) {
      throw new Error("Bing translation redirected away from the approved request URL.");
    }
  }
  function collectMatches2(text, pattern) {
    return [...text.matchAll(pattern)].map((match) => match[1]);
  }
  function collectObjectInitializerIgValues2(scriptText) {
    const objectBodies = collectMatches2(
      scriptText,
      new RegExp(
        String.raw`(?:^|[;\r\n])\s*(?:var\s+)?(?:window\.)?_G\s*=\s*\{([^;\r\n]{1,${MAX_GLOBAL_OBJECT_CHARACTERS2}})\}\s*;`,
        "gu"
      )
    );
    return objectBodies.flatMap((body) => collectMatches2(
      body,
      /(?:^|,)\s*IG\s*:\s*["']([A-Za-z0-9_-]{8,128})["'](?=\s*(?:,|$))/gu
    ));
  }
  function parseTranslations(responseText, phrases) {
    if (typeof responseText !== "string" || responseText.includes("ShowCaptcha")) {
      throw new Error("Bing translation returned CAPTCHA or invalid content.");
    }
    const payload = JSON.parse(responseText);
    if (!Array.isArray(payload) || payload.length < 1 || payload.length > 2) {
      throw new Error("Bing translation returned an unexpected response structure.");
    }
    if (payload.length === 2 && !isValidInputTransliteration(payload[1])) {
      throw new Error("Bing translation returned unexpected transliteration metadata.");
    }
    const result = payload[0];
    if (!Array.isArray(result?.translations) || result.translations.length !== 1) {
      throw new Error("Bing translation returned an ambiguous response.");
    }
    const candidate = result.translations[0];
    const translatedLines = typeof candidate?.text === "string" ? candidate.text.split(/\r?\n/u).map((line) => line.trim()) : [];
    if (translatedLines.length !== phrases.length || candidate?.to != null && candidate.to !== "en" || result.detectedLanguage?.language != null && result.detectedLanguage.language !== "ja") {
      throw new Error("Bing translation returned no reliable Japanese-to-English translation.");
    }
    const translations = /* @__PURE__ */ new Map();
    for (let index = 0; index < phrases.length; index += 1) {
      const phrase = phrases[index];
      const translated = translatedLines[index];
      if (!translated || translated === phrase || !LATIN_LETTER.test(translated)) {
        throw new Error("Bing translation returned no reliable Japanese-to-English translation.");
      }
      translations.set(phrase, translated);
    }
    return translations;
  }
  function isValidInputTransliteration(value) {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const keys = Object.keys(value).sort();
    if (keys.length !== 2 || keys[0] !== "inputTransliteration" || keys[1] !== "script") {
      return false;
    }
    const transliteration = value.inputTransliteration;
    return typeof transliteration === "string" && transliteration.length > 0 && transliteration.length <= MAX_TRANSLITERATION_CHARACTERS && transliteration === transliteration.trim() && LATIN_LETTER.test(transliteration) && value.script === "Latn";
  }
  function isEligiblePhrase(phrase, maxPhraseCharacters) {
    if (typeof phrase !== "string" || phrase.length === 0 || phrase.length > maxPhraseCharacters) {
      return false;
    }
    const matches = findKatakanaMatches(phrase);
    return matches.length === 1 && matches[0].start === 0 && matches[0].end === phrase.length;
  }
  function buildBatches2(phrases, { maxPhrasesPerRequest, maxEncodedTextLength }) {
    const batches = [];
    let batch = [];
    for (const phrase of phrases) {
      if (encodedTextLength2([phrase]) > maxEncodedTextLength) {
        continue;
      }
      const candidate = [...batch, phrase];
      if (batch.length > 0 && (candidate.length > maxPhrasesPerRequest || encodedTextLength2(candidate) > maxEncodedTextLength)) {
        batches.push(batch);
        batch = [];
      }
      batch.push(phrase);
    }
    if (batch.length > 0) {
      batches.push(batch);
    }
    return batches;
  }
  function encodedTextLength2(phrases) {
    return encodeURIComponent(phrases.join("\n")).length;
  }
  function request2(gmRequest, options, { signal, label }) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError2());
        return;
      }
      let settled = false;
      let handle;
      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        callback(value);
      };
      const onAbort = () => {
        handle?.abort?.();
        finish(reject, abortError2());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      handle = gmRequest({
        ...options,
        onload(response) {
          if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
            const status = Number.isInteger(response?.status) ? response.status : "unknown";
            finish(reject, new HttpError2(`${label} returned HTTP ${status}.`, response?.status));
            return;
          }
          finish(resolve, response ?? {});
        },
        onerror(response) {
          finish(reject, new Error(response?.statusText || `${label} request failed.`));
        },
        ontimeout() {
          finish(reject, new Error(`${label} request timed out.`));
        },
        onabort() {
          finish(reject, abortError2());
        }
      });
    });
  }
  var HttpError2 = class extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  };
  function throwIfAborted2(signal) {
    if (signal?.aborted) {
      throw abortError2();
    }
  }
  function abortError2() {
    return new DOMException("The Bing translation was aborted.", "AbortError");
  }
  function wait2(milliseconds, { signal } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError2());
        return;
      }
      const timer = setTimeout(finish, milliseconds);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(abortError2());
      };
      function finish() {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  // src/dom.js
  var BLOCKED_TAGS = /* @__PURE__ */ new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "FORM",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "OPTION",
    "BUTTON",
    "CODE",
    "PRE",
    "KBD",
    "SAMP",
    "RUBY",
    "RT",
    "RP",
    "SVG",
    "MATH",
    "CANVAS",
    "AUDIO",
    "VIDEO"
  ]);
  var convertedRubySnapshots = /* @__PURE__ */ new WeakMap();
  var KANA_ONLY2 = /^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fd\u30feー・\s]+$/u;
  function shouldSkipTextNode(node) {
    if (!node || node.nodeType !== 3 || !node.parentElement || !node.textContent.trim()) {
      return true;
    }
    for (let element = node.parentElement; element; element = element.parentElement) {
      if (BLOCKED_TAGS.has(element.tagName)) {
        return true;
      }
      if (element.hasAttribute("data-yomi-ruby-generated") || element.hasAttribute("data-yomi-ruby-converted-rt") || element.hasAttribute("data-yomi-ruby-status")) {
        return true;
      }
      if (element.hidden || element.hasAttribute("inert") || element.getAttribute("aria-hidden") === "true") {
        return true;
      }
      const editable = element.getAttribute("contenteditable");
      if (editable != null && editable.toLowerCase() !== "false") {
        return true;
      }
      const style = element.ownerDocument.defaultView?.getComputedStyle?.(element);
      if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") {
        return true;
      }
    }
    return false;
  }
  function convertExistingKanaRuby(root) {
    let converted = 0;
    const rubyElements = [];
    if (root.matches?.("ruby:not([data-yomi-ruby-generated])")) {
      rubyElements.push(root);
    }
    rubyElements.push(...root.querySelectorAll("ruby:not([data-yomi-ruby-generated])"));
    for (const ruby of rubyElements) {
      if (isKatakanaTerminatorRuby(ruby)) {
        continue;
      }
      const rtElements = [...ruby.querySelectorAll(":scope > rt")];
      const baseText = [...ruby.childNodes].filter((node) => !(node.nodeType === 1 && ["RT", "RP"].includes(node.tagName))).map((node) => node.textContent).join("");
      if (!new RegExp("\\p{Script=Han}", "u").test(baseText)) {
        continue;
      }
      for (const rt of rtElements) {
        const reading = rt.textContent.trim();
        if (!KANA_ONLY2.test(reading)) {
          continue;
        }
        const romaji = kanaToHepburn(reading);
        if (!romaji) {
          continue;
        }
        convertedRubySnapshots.set(rt, {
          text: rt.textContent,
          attributes: [...rt.attributes].map(({ name, value }) => [name, value])
        });
        rt.textContent = romaji;
        rt.classList.add("yomi-ruby-existing-rt");
        rt.setAttribute("data-yomi-ruby-converted-rt", "");
        rt.setAttribute("data-yomi-ruby-kana", reading);
        converted += 1;
      }
    }
    return converted;
  }
  function restoreConvertedKanaRuby(root) {
    for (const rt of root.querySelectorAll("rt[data-yomi-ruby-converted-rt]")) {
      const snapshot = convertedRubySnapshots.get(rt);
      if (!snapshot) {
        continue;
      }
      rt.textContent = snapshot.text;
      for (const attribute of [...rt.attributes]) {
        rt.removeAttribute(attribute.name);
      }
      for (const [name, value] of snapshot.attributes) {
        rt.setAttribute(name, value);
      }
      convertedRubySnapshots.delete(rt);
    }
  }
  function isKatakanaTerminatorRuby(ruby) {
    return Boolean(ruby.querySelector("rt.katakana-terminator-rt, rt[data-rt]"));
  }

  // src/coordinator.js
  var AnnotationCoordinator = class {
    constructor({
      document: document2,
      MutationObserver = document2?.defaultView?.MutationObserver,
      setTimer = document2?.defaultView?.setTimeout?.bind(document2.defaultView) ?? globalThis.setTimeout,
      clearTimer = document2?.defaultView?.clearTimeout?.bind(document2.defaultView) ?? globalThis.clearTimeout,
      requestIdleCallback = document2?.defaultView?.requestIdleCallback?.bind(document2.defaultView),
      cancelIdleCallback = document2?.defaultView?.cancelIdleCallback?.bind(document2.defaultView),
      flushDelayMs = 500,
      scanBatchSize = 100
    }) {
      if (!document2) {
        throw new TypeError("An AnnotationCoordinator requires a document.");
      }
      this.document = document2;
      this.MutationObserver = MutationObserver;
      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.requestIdleCallback = requestIdleCallback;
      this.cancelIdleCallback = cancelIdleCallback;
      this.flushDelayMs = flushDelayMs;
      this.scanBatchSize = scanBatchSize;
      this.kanjiRuntime = null;
      this.katakanaRuntime = null;
      this.active = false;
      this.hidden = document2.visibilityState === "hidden";
      this.records = /* @__PURE__ */ new Set();
      this.nodeRecords = /* @__PURE__ */ new WeakMap();
      this.pendingRoots = /* @__PURE__ */ new Set();
      this.pendingNodes = [];
      this.pendingNodeSet = /* @__PURE__ */ new Set();
      this.flushTimer = null;
      this.scanHandle = null;
      this.mutationObserver = null;
      this.onVisibilityChange = () => this.#handleVisibilityChange();
    }
    enableKanji(runtime) {
      assertRuntime(runtime, "Kanji");
      this.kanjiRuntime = runtime;
      this.#ensureActive();
      convertExistingKanaRuby(this.document);
      this.#reprocessAll();
      this.#queueRoot(this.document.body ?? this.document.documentElement, { immediate: true });
    }
    disableKanji() {
      const runtime = this.kanjiRuntime;
      this.kanjiRuntime = null;
      restoreConvertedKanaRuby(this.document);
      for (const record of this.records) {
        runtime?.forget(record);
      }
      if (!this.katakanaRuntime) {
        this.#stop();
        return;
      }
      this.#reprocessAll();
    }
    enableKatakana(runtime) {
      assertRuntime(runtime, "Katakana");
      this.katakanaRuntime = runtime;
      this.#ensureActive();
      this.#reprocessAll();
      this.#queueRoot(this.document.body ?? this.document.documentElement, { immediate: true });
    }
    disableKatakana() {
      const runtime = this.katakanaRuntime;
      this.katakanaRuntime = null;
      for (const record of this.records) {
        runtime?.forget(record);
      }
      if (!this.kanjiRuntime) {
        this.#stop();
        return;
      }
      this.#reprocessAll();
    }
    refresh(record) {
      if (!this.active || this.hidden || !this.records.has(record)) {
        return;
      }
      this.#processRecord(record);
    }
    stop() {
      this.kanjiRuntime = null;
      this.katakanaRuntime = null;
      this.#stop();
    }
    #ensureActive() {
      if (this.active) {
        return;
      }
      this.active = true;
      this.hidden = this.document.visibilityState === "hidden";
      this.document.addEventListener("visibilitychange", this.onVisibilityChange);
      if (this.MutationObserver) {
        this.mutationObserver = new this.MutationObserver((mutations) => this.#onMutations(mutations));
        this.mutationObserver.observe(this.document.body ?? this.document.documentElement, {
          childList: true,
          characterData: true,
          subtree: true
        });
      }
      if (this.hidden) {
        this.kanjiRuntime?.pause();
        this.katakanaRuntime?.pause();
      }
    }
    #stop() {
      if (!this.active) {
        restoreConvertedKanaRuby(this.document);
        return;
      }
      this.active = false;
      this.document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.mutationObserver?.disconnect();
      this.mutationObserver = null;
      this.#cancelScheduledWork();
      this.pendingRoots.clear();
      this.pendingNodes.length = 0;
      this.pendingNodeSet.clear();
      for (const record of this.records) {
        this.#restoreRecord(record);
      }
      this.records.clear();
      restoreConvertedKanaRuby(this.document);
      this.document.normalize?.();
    }
    #handleVisibilityChange() {
      if (!this.active) {
        return;
      }
      this.hidden = this.document.visibilityState === "hidden";
      if (this.hidden) {
        this.kanjiRuntime?.pause();
        this.katakanaRuntime?.pause();
        this.#cancelScheduledWork();
        return;
      }
      this.kanjiRuntime?.resume();
      this.katakanaRuntime?.resume();
      this.#discardDetachedRecords();
      this.#reprocessAll();
      this.#queueRoot(this.document.body ?? this.document.documentElement, { immediate: true });
    }
    #onMutations(mutations) {
      if (!this.active) {
        return;
      }
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const record = this.nodeRecords.get(mutation.target);
          if (record && this.#recordIsCurrent(record)) {
            continue;
          }
          if (record) {
            this.#discardRecord(record);
          }
          this.pendingRoots.add(mutation.target);
          continue;
        }
        for (const node of mutation.removedNodes) {
          this.#discardDetachedOwnership(node);
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.closest?.("[data-yomi-ruby-generated], [data-yomi-ruby-converted-rt]")) {
            continue;
          }
          this.pendingRoots.add(node);
        }
      }
      this.#scheduleFlush();
    }
    #queueRoot(root, { immediate = false } = {}) {
      if (!this.active || !root) {
        return;
      }
      this.pendingRoots.add(root);
      if (immediate && !this.hidden) {
        this.#flushRoots();
      } else {
        this.#scheduleFlush();
      }
    }
    #scheduleFlush() {
      if (!this.active || this.hidden || this.flushTimer != null) {
        return;
      }
      this.flushTimer = this.setTimer(() => {
        this.flushTimer = null;
        this.#flushRoots();
      }, this.flushDelayMs);
    }
    #flushRoots() {
      if (!this.active || this.hidden) {
        return;
      }
      const roots = [...this.pendingRoots];
      this.pendingRoots.clear();
      for (const root of roots) {
        this.#collectTextNodes(root);
      }
      this.#scheduleNodeDrain();
    }
    #collectTextNodes(root) {
      if (!root?.isConnected) {
        return;
      }
      if (root.nodeType === 3) {
        this.#enqueueTextNode(root);
        return;
      }
      if (![1, 9, 11].includes(root.nodeType)) {
        return;
      }
      if (this.kanjiRuntime) {
        convertExistingKanaRuby(root);
      }
      const walker = this.document.createTreeWalker(
        root,
        this.document.defaultView.NodeFilter.SHOW_TEXT,
        { acceptNode: (node) => shouldSkipTextNode(node) || this.nodeRecords.has(node) ? this.document.defaultView.NodeFilter.FILTER_REJECT : this.document.defaultView.NodeFilter.FILTER_ACCEPT }
      );
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        this.#enqueueTextNode(node);
      }
    }
    #enqueueTextNode(node) {
      if (!node?.isConnected || this.nodeRecords.has(node) || this.pendingNodeSet.has(node) || shouldSkipTextNode(node)) {
        return;
      }
      this.pendingNodeSet.add(node);
      this.pendingNodes.push(node);
    }
    #scheduleNodeDrain() {
      if (!this.active || this.hidden || this.scanHandle != null || this.pendingNodes.length === 0) {
        return;
      }
      if (this.requestIdleCallback) {
        this.scanHandle = this.requestIdleCallback((deadline) => this.#drainNodes(deadline), {
          timeout: this.flushDelayMs
        });
        return;
      }
      this.scanHandle = this.setTimer(() => this.#drainNodes({
        didTimeout: true,
        timeRemaining: () => 0
      }), 0);
    }
    #drainNodes(deadline) {
      this.scanHandle = null;
      if (!this.active || this.hidden) {
        return;
      }
      let processed = 0;
      while (this.pendingNodes.length > 0 && processed < this.scanBatchSize && (deadline.didTimeout || deadline.timeRemaining() > 1)) {
        const node = this.pendingNodes.shift();
        this.pendingNodeSet.delete(node);
        if (node.isConnected && !this.nodeRecords.has(node) && !shouldSkipTextNode(node)) {
          const record = {
            text: node.textContent,
            originalText: node.textContent,
            currentNodes: [node],
            planKey: null,
            valid: true
          };
          this.records.add(record);
          this.nodeRecords.set(node, record);
          this.#processRecord(record);
        }
        processed += 1;
      }
      this.#scheduleNodeDrain();
    }
    #processRecord(record) {
      if (!this.#recordIsCurrent(record)) {
        this.#discardRecord(record);
        return;
      }
      const katakanaPlan = this.katakanaRuntime?.plan(record) ?? {
        ranges: [],
        reservations: []
      };
      const kanjiPlan = this.kanjiRuntime?.plan(record) ?? { ranges: [] };
      const annotations = [];
      for (const range of kanjiPlan.ranges) {
        if (!katakanaPlan.reservations.some((reserved) => overlaps(range, reserved))) {
          annotations.push({ ...range, feature: "kanji" });
        }
      }
      for (const range of katakanaPlan.ranges) {
        annotations.push({ ...range, feature: "katakana" });
      }
      annotations.sort((left, right) => left.start - right.start || left.end - right.end);
      this.#renderRecord(record, annotations);
    }
    #reprocessAll() {
      if (this.hidden) {
        return;
      }
      for (const record of [...this.records]) {
        this.#processRecord(record);
      }
    }
    #renderRecord(record, annotations) {
      const planKey = JSON.stringify(annotations.map((range) => [
        range.start,
        range.end,
        range.feature,
        range.annotation,
        range.reading,
        range.romaji
      ]));
      if (record.planKey === planKey) {
        return;
      }
      const parent = record.currentNodes[0]?.parentNode;
      if (!parent || record.currentNodes.some((node) => node.parentNode !== parent)) {
        this.#discardRecord(record);
        return;
      }
      const fragment = this.document.createDocumentFragment();
      let cursor = 0;
      for (const range of annotations) {
        if (range.start < cursor) {
          continue;
        }
        if (range.start > cursor) {
          fragment.append(this.document.createTextNode(record.originalText.slice(cursor, range.start)));
        }
        fragment.append(this.#createRuby(range));
        cursor = range.end;
      }
      if (cursor < record.originalText.length) {
        fragment.append(this.document.createTextNode(record.originalText.slice(cursor)));
      }
      if (!fragment.childNodes.length) {
        fragment.append(this.document.createTextNode(record.originalText));
      }
      const nextNodes = [...fragment.childNodes];
      parent.insertBefore(fragment, record.currentNodes[0]);
      for (const node of record.currentNodes) {
        node.remove();
      }
      record.currentNodes = nextNodes;
      record.planKey = planKey;
      for (const node of nextNodes) {
        this.nodeRecords.set(node, record);
      }
    }
    #createRuby(range) {
      const ruby = this.document.createElement("ruby");
      ruby.className = range.feature === "kanji" ? "yomi-ruby-ruby" : "yomi-ruby-ruby yomi-ruby-katakana-ruby";
      ruby.setAttribute("data-yomi-ruby-generated", "");
      ruby.setAttribute("data-yomi-ruby-feature", range.feature);
      const base = this.document.createElement("span");
      base.className = "yomi-ruby-base";
      base.textContent = range.text;
      const rt = this.document.createElement("rt");
      rt.className = range.feature === "kanji" ? "yomi-ruby-rt" : "yomi-ruby-rt yomi-ruby-katakana-rt";
      if (range.feature === "kanji") {
        if (typeof range.reading === "string" && range.reading.length > 0) {
          ruby.setAttribute("data-yomi-ruby-kana", range.reading);
          ruby.tabIndex = 0;
        }
        rt.textContent = range.romaji;
      } else {
        rt.textContent = range.annotation;
      }
      ruby.append(base, rt);
      return ruby;
    }
    #restoreRecord(record) {
      if (!this.#recordIsCurrent(record)) {
        return;
      }
      const parent = record.currentNodes[0].parentNode;
      const text = this.document.createTextNode(record.originalText);
      parent.insertBefore(text, record.currentNodes[0]);
      for (const node of record.currentNodes) {
        node.remove();
      }
    }
    #discardRecord(record) {
      if (!this.records.has(record)) {
        return;
      }
      this.kanjiRuntime?.forget(record);
      this.katakanaRuntime?.forget(record);
      const parent = record.currentNodes[0]?.parentNode;
      if (parent && record.currentNodes.every((node) => node.parentNode === parent) && record.currentNodes.map(sourceText).join("") === record.originalText) {
        const text = this.document.createTextNode(record.originalText);
        parent.insertBefore(text, record.currentNodes[0]);
        for (const node of record.currentNodes) {
          node.remove();
        }
      }
      for (const node of record.currentNodes) {
        this.nodeRecords.delete(node);
      }
      record.valid = false;
      this.records.delete(record);
    }
    #discardDetachedOwnership(root) {
      const found = /* @__PURE__ */ new Set();
      const stack = [root];
      while (stack.length > 0) {
        const node = stack.pop();
        const record = this.nodeRecords.get(node);
        if (record) {
          found.add(record);
        }
        stack.push(...node.childNodes);
      }
      for (const record of found) {
        if (record.currentNodes.some((node) => !node.isConnected)) {
          this.#discardRecord(record);
        }
      }
    }
    #discardDetachedRecords() {
      for (const record of [...this.records]) {
        if (!this.#recordIsCurrent(record)) {
          this.#discardRecord(record);
        }
      }
    }
    #recordIsCurrent(record) {
      if (!record.valid || record.currentNodes.length === 0) {
        return false;
      }
      const parent = record.currentNodes[0].parentNode;
      return Boolean(
        parent && record.currentNodes.every((node) => node.isConnected && node.parentNode === parent) && record.currentNodes.map(sourceText).join("") === record.originalText
      );
    }
    #cancelScheduledWork() {
      if (this.flushTimer != null) {
        this.clearTimer(this.flushTimer);
        this.flushTimer = null;
      }
      if (this.scanHandle != null) {
        if (this.requestIdleCallback && this.cancelIdleCallback) {
          this.cancelIdleCallback(this.scanHandle);
        } else {
          this.clearTimer(this.scanHandle);
        }
        this.scanHandle = null;
      }
    }
  };
  function assertRuntime(runtime, label) {
    if (!runtime || typeof runtime.plan !== "function" || typeof runtime.forget !== "function" || typeof runtime.pause !== "function" || typeof runtime.resume !== "function") {
      throw new TypeError(`${label} annotation requires a runtime interface.`);
    }
  }
  function overlaps(left, right) {
    return left.start < right.end && right.start < left.end;
  }
  function sourceText(node) {
    if (node.nodeType === 3) {
      return node.textContent;
    }
    if (node.nodeType === 1 && node.hasAttribute("data-yomi-ruby-generated")) {
      return node.querySelector(":scope > .yomi-ruby-base")?.textContent ?? "";
    }
    return node.textContent ?? "";
  }

  // src/settings.js
  var SETTING_PREFIXES = Object.freeze({
    kanji: "yomi-ruby:auto-origin:",
    katakana: "yomi-ruby:katakana-origin:"
  });
  var LOCALE_SETTING_KEY = "yomi-ruby:locale";
  var SUPPORTED_LOCALES = Object.freeze(["en", "zh"]);
  var KANJI_ROMAJI_MODE_SETTING_KEY = "yomi-ruby:kanji-romaji-mode";
  var SUPPORTED_KANJI_ROMAJI_MODES = Object.freeze(["bing", "google", "local"]);
  var TRANSLATION_PROVIDER_SETTING_KEY = "yomi-ruby:translation-provider";
  var SUPPORTED_TRANSLATION_PROVIDERS = Object.freeze(["bing", "google"]);
  function isSupportedLocale(value) {
    return SUPPORTED_LOCALES.includes(value);
  }
  function isSupportedTranslationProvider(value) {
    return SUPPORTED_TRANSLATION_PROVIDERS.includes(value);
  }
  function isSupportedKanjiRomajiMode(value) {
    return SUPPORTED_KANJI_ROMAJI_MODES.includes(value);
  }
  function originSettingKey(feature, origin) {
    const prefix = SETTING_PREFIXES[feature];
    if (!prefix) {
      throw new TypeError(`Unknown YomiRuby feature: ${feature}`);
    }
    return `${prefix}${origin}`;
  }
  async function getFeatureEnabledForOrigin(gmGetValue, feature, origin = location.origin) {
    return await gmGetValue(originSettingKey(feature, origin), false) === true;
  }
  async function setFeatureEnabledForOrigin(gmSetValue, feature, enabled, origin = location.origin) {
    await gmSetValue(originSettingKey(feature, origin), Boolean(enabled));
  }
  async function getStoredLocale(gmGetValue) {
    return gmGetValue(LOCALE_SETTING_KEY, null);
  }
  async function setStoredLocale(gmSetValue, locale) {
    if (!isSupportedLocale(locale)) {
      throw new TypeError(`Unsupported YomiRuby locale: ${locale}`);
    }
    await gmSetValue(LOCALE_SETTING_KEY, locale);
  }
  async function getStoredTranslationProvider(gmGetValue) {
    return gmGetValue(TRANSLATION_PROVIDER_SETTING_KEY, null);
  }
  async function setStoredTranslationProvider(gmSetValue, provider) {
    if (!isSupportedTranslationProvider(provider)) {
      throw new TypeError(`Unsupported YomiRuby translation provider: ${provider}`);
    }
    await gmSetValue(TRANSLATION_PROVIDER_SETTING_KEY, provider);
  }
  async function getStoredKanjiRomajiMode(gmGetValue) {
    return gmGetValue(KANJI_ROMAJI_MODE_SETTING_KEY, null);
  }
  async function setStoredKanjiRomajiMode(gmSetValue, mode) {
    if (!isSupportedKanjiRomajiMode(mode)) {
      throw new TypeError(`Unsupported YomiRuby kanji romaji mode: ${mode}`);
    }
    await gmSetValue(KANJI_ROMAJI_MODE_SETTING_KEY, mode);
  }
  async function initializeKanjiRomajiMode({
    getValue,
    setValue,
    primaryLanguage
  }) {
    let storedMode;
    let storedLocale;
    let storedTranslationProvider;
    try {
      [storedMode, storedLocale, storedTranslationProvider] = await Promise.all([
        getStoredKanjiRomajiMode(getValue),
        getStoredLocale(getValue),
        getStoredTranslationProvider(getValue)
      ]);
    } catch (readError) {
      return {
        mode: "local",
        readError,
        persistenceError: null
      };
    }
    if (isSupportedKanjiRomajiMode(storedMode)) {
      return {
        mode: storedMode,
        readError: null,
        persistenceError: null
      };
    }
    const hasLegacySettings = storedMode != null || storedLocale != null || storedTranslationProvider != null;
    const mode = hasLegacySettings ? "local" : typeof primaryLanguage === "string" && primaryLanguage.toLowerCase().startsWith("zh") ? "bing" : "google";
    try {
      await setStoredKanjiRomajiMode(setValue, mode);
      return {
        mode,
        readError: null,
        persistenceError: null
      };
    } catch (persistenceError) {
      return {
        mode,
        readError: null,
        persistenceError
      };
    }
  }
  async function initializeTranslationProvider({ getValue, setValue, locale }) {
    const defaultProvider = locale === "zh" ? "bing" : "google";
    let storedProvider;
    try {
      storedProvider = await getStoredTranslationProvider(getValue);
    } catch (readError) {
      return {
        provider: defaultProvider,
        readError,
        persistenceError: null
      };
    }
    if (isSupportedTranslationProvider(storedProvider)) {
      return {
        provider: storedProvider,
        readError: null,
        persistenceError: null
      };
    }
    try {
      await setStoredTranslationProvider(setValue, defaultProvider);
      return {
        provider: defaultProvider,
        readError: null,
        persistenceError: null
      };
    } catch (persistenceError) {
      return {
        provider: defaultProvider,
        readError: null,
        persistenceError
      };
    }
  }

  // src/controls.js
  async function installYomiRubyControls({
    origin,
    registerMenuCommand,
    unregisterMenuCommand,
    getValue,
    setValue,
    addValueChangeListener = null,
    removeValueChangeListener = null,
    localizer: localizer2,
    localePersistenceError = null,
    kanjiRomajiMode,
    kanjiRomajiModeReadError = null,
    kanjiRomajiModePersistenceError = null,
    translationProvider,
    translationProviderReadError = null,
    translationProviderPersistenceError = null,
    kanji,
    katakana,
    showStatus
  }) {
    const persistence = {
      kanjiFeature: createPersistenceQueue(),
      katakanaFeature: createPersistenceQueue(),
      kanjiMode: createPersistenceQueue(),
      provider: createPersistenceQueue(),
      locale: createPersistenceQueue()
    };
    const definitions = [
      {
        feature: "kanji",
        menuKey: "Kanji",
        session: kanji
      },
      {
        feature: "katakana",
        menuKey: "Katakana",
        session: katakana
      }
    ];
    let refreshMenus = () => {
    };
    const controls = [];
    const featureReadErrors = [];
    for (const definition of definitions) {
      let enabled = false;
      try {
        enabled = await getFeatureEnabledForOrigin(getValue, definition.feature, origin);
      } catch (error) {
        featureReadErrors.push({ feature: definition.feature, error });
      }
      controls.push(createFeatureControl({
        ...definition,
        enabled,
        origin,
        registerMenuCommand,
        unregisterMenuCommand,
        persist: (nextEnabled) => persistence[`${definition.feature}Feature`].enqueue(() => setFeatureEnabledForOrigin(
          setValue,
          definition.feature,
          nextEnabled,
          origin
        )),
        showStatus,
        localizer: localizer2,
        refreshMenus: () => refreshMenus()
      }));
    }
    let languageMenuId = null;
    let kanjiModeMenuId = null;
    let kanjiModeOperation = 0;
    let currentKanjiMode = kanjiRomajiMode;
    let persistedKanjiMode = kanjiRomajiMode;
    let desiredKanjiMode = kanjiRomajiMode;
    const registerKanjiMode = () => {
      if (kanjiModeMenuId != null) {
        unregisterMenuCommand(kanjiModeMenuId);
      }
      const nextMode = nextKanjiMode(currentKanjiMode, localizer2.getLocale());
      kanjiModeMenuId = registerMenuCommand(
        localizer2.t("menu.kanjiRomajiMode", { mode: currentKanjiMode, nextMode }),
        async () => {
          const requestedMode = nextKanjiMode(desiredKanjiMode, localizer2.getLocale());
          desiredKanjiMode = requestedMode;
          const requestOperation = ++kanjiModeOperation;
          try {
            await persistence.kanjiMode.enqueue(() => setStoredKanjiRomajiMode(setValue, requestedMode));
          } catch (error) {
            if (requestOperation === kanjiModeOperation) {
              desiredKanjiMode = persistedKanjiMode;
              showStatus(localizer2.t("error.kanjiRomajiModePersistence", {
                error: errorMessage(error)
              }), {
                duration: 9e3,
                error: true
              });
            }
            return;
          }
          persistedKanjiMode = requestedMode;
          if (requestOperation === kanjiModeOperation) {
            currentKanjiMode = requestedMode;
            desiredKanjiMode = requestedMode;
            refreshMenus();
            await kanji.setMode(requestedMode);
          }
        }
      );
    };
    let providerMenuId = null;
    let providerOperation = 0;
    let currentProvider = translationProvider;
    let persistedProvider = translationProvider;
    let desiredProvider = translationProvider;
    const registerProvider = () => {
      if (providerMenuId != null) {
        unregisterMenuCommand(providerMenuId);
      }
      const nextProvider = currentProvider === "bing" ? "google" : "bing";
      providerMenuId = registerMenuCommand(
        localizer2.t("menu.translationProvider", { provider: currentProvider, nextProvider }),
        async () => {
          const requestedProvider = desiredProvider === "bing" ? "google" : "bing";
          desiredProvider = requestedProvider;
          const requestOperation = ++providerOperation;
          try {
            await persistence.provider.enqueue(() => setStoredTranslationProvider(setValue, requestedProvider));
          } catch (error) {
            if (requestOperation === providerOperation) {
              desiredProvider = persistedProvider;
              showStatus(localizer2.t("error.translationProviderPersistence", {
                error: errorMessage(error)
              }), {
                duration: 9e3,
                error: true
              });
            }
            return;
          }
          persistedProvider = requestedProvider;
          if (requestOperation === providerOperation) {
            currentProvider = requestedProvider;
            desiredProvider = requestedProvider;
            refreshMenus();
            await katakana.setProvider(requestedProvider);
          }
        }
      );
    };
    let languageOperation = 0;
    let persistedLocale = localizer2.getLocale();
    let desiredLocale = persistedLocale;
    const registerLanguage = () => {
      if (languageMenuId != null) {
        unregisterMenuCommand(languageMenuId);
      }
      languageMenuId = registerMenuCommand(localizer2.t("menu.language"), async () => {
        const requestOperation = ++languageOperation;
        const nextLocale = desiredLocale === "zh" ? "en" : "zh";
        desiredLocale = nextLocale;
        try {
          await persistence.locale.enqueue(() => setStoredLocale(setValue, nextLocale));
        } catch (error) {
          if (requestOperation === languageOperation) {
            desiredLocale = persistedLocale;
            showStatus(localizer2.t("error.localePersistence", { error: errorMessage(error) }), {
              duration: 9e3,
              error: true
            });
          }
          return;
        }
        persistedLocale = nextLocale;
        if (requestOperation === languageOperation) {
          localizer2.setLocale(nextLocale);
          desiredLocale = nextLocale;
          refreshMenus();
        }
      });
    };
    refreshMenus = () => {
      controls[0].register();
      registerKanjiMode();
      controls[1].register();
      registerProvider();
      registerLanguage();
    };
    refreshMenus();
    if (localePersistenceError) {
      showStatus(localizer2.t("error.localePersistence", {
        error: errorMessage(localePersistenceError)
      }), {
        duration: 9e3,
        error: true
      });
    }
    if (translationProviderPersistenceError) {
      showStatus(localizer2.t("error.translationProviderPersistence", {
        error: errorMessage(translationProviderPersistenceError)
      }), {
        duration: 9e3,
        error: true
      });
    }
    if (translationProviderReadError) {
      showStatus(localizer2.t("error.translationProviderRead", {
        error: errorMessage(translationProviderReadError)
      }), {
        duration: 9e3,
        error: true
      });
    }
    if (kanjiRomajiModePersistenceError) {
      showStatus(localizer2.t("error.kanjiRomajiModePersistence", {
        error: errorMessage(kanjiRomajiModePersistenceError)
      }), {
        duration: 9e3,
        error: true
      });
    }
    if (kanjiRomajiModeReadError) {
      showStatus(localizer2.t("error.kanjiRomajiModeRead", {
        error: errorMessage(kanjiRomajiModeReadError)
      }), {
        duration: 9e3,
        error: true
      });
    }
    for (const { feature, error } of featureReadErrors) {
      showStatus(localizer2.t(`error.${feature}ReadPersistence`, {
        error: errorMessage(error)
      }), {
        duration: 9e3,
        error: true
      });
    }
    for (const control of controls) {
      control.startIfEnabled();
    }
    const listenerIds = [];
    if (typeof addValueChangeListener === "function") {
      listenerIds.push(addValueChangeListener(
        KANJI_ROMAJI_MODE_SETTING_KEY,
        async (_key, _oldValue, nextMode, remote) => {
          if (remote !== true || !isSupportedKanjiRomajiMode(nextMode)) {
            return;
          }
          kanjiModeOperation += 1;
          currentKanjiMode = nextMode;
          persistedKanjiMode = nextMode;
          desiredKanjiMode = nextMode;
          refreshMenus();
          await kanji.setMode(nextMode);
        }
      ));
      listenerIds.push(addValueChangeListener(
        TRANSLATION_PROVIDER_SETTING_KEY,
        async (_key, _oldValue, nextProvider, remote) => {
          if (remote !== true || !isSupportedTranslationProvider(nextProvider)) {
            return;
          }
          providerOperation += 1;
          currentProvider = nextProvider;
          persistedProvider = nextProvider;
          desiredProvider = nextProvider;
          refreshMenus();
          await katakana.setProvider(nextProvider);
        }
      ));
    }
    return {
      dispose() {
        if (typeof removeValueChangeListener === "function") {
          for (const listenerId of listenerIds) {
            removeValueChangeListener(listenerId);
          }
        }
      }
    };
  }
  function nextKanjiMode(mode, locale) {
    const order = locale === "zh" ? ["bing", "local", "google"] : ["google", "local", "bing"];
    const index = order.indexOf(mode);
    return order[(index < 0 ? 0 : index + 1) % order.length];
  }
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function createPersistenceQueue() {
    let queue = Promise.resolve();
    return {
      enqueue(write) {
        const result = queue.then(write);
        queue = result.catch(() => {
        });
        return result;
      }
    };
  }
  function createFeatureControl({
    feature,
    menuKey,
    session,
    enabled: initialEnabled,
    registerMenuCommand,
    unregisterMenuCommand,
    persist,
    showStatus,
    localizer: localizer2,
    refreshMenus
  }) {
    if (!session || typeof session.enable !== "function" || typeof session.disable !== "function") {
      throw new TypeError(`The ${feature} feature requires enable and disable functions.`);
    }
    let enabled = initialEnabled;
    let desiredEnabled = initialEnabled;
    let menuId = null;
    let operation = 0;
    const register = () => {
      if (menuId != null) {
        unregisterMenuCommand(menuId);
      }
      menuId = registerMenuCommand(localizer2.t(`menu.${enabled ? "disable" : "enable"}${menuKey}`), async () => {
        const requestedEnabled = !desiredEnabled;
        desiredEnabled = requestedEnabled;
        const requestOperation = ++operation;
        try {
          await persist(requestedEnabled);
        } catch (error) {
          if (requestOperation === operation) {
            desiredEnabled = enabled;
            showStatus(localizer2.t(
              `error.${feature}${requestedEnabled ? "Enable" : "Disable"}Persistence`,
              { error: errorMessage(error) }
            ), {
              duration: 9e3,
              error: true
            });
          }
          return;
        }
        if (requestOperation === operation) {
          enabled = requestedEnabled;
          desiredEnabled = requestedEnabled;
          refreshMenus();
          if (requestedEnabled) {
            await session.enable();
          } else {
            session.disable();
          }
        }
      });
    };
    return {
      register,
      startIfEnabled() {
        if (enabled) {
          void session.enable();
        }
      }
    };
  }

  // src/i18n.js
  var MESSAGES = Object.freeze({
    en: Object.freeze({
      "menu.enableKanji": "Enable Kanji Romaji on this site",
      "menu.disableKanji": "Disable Kanji Romaji on this site",
      "menu.kanjiRomajiMode": ({ mode, nextMode }) => `Kanji Romaji: ${kanjiModeName(mode, "en")} (switch to ${kanjiModeName(nextMode, "en")})`,
      "menu.enableKatakana": "Enable Online Katakana English on this site",
      "menu.disableKatakana": "Disable Online Katakana English on this site",
      "menu.translationProvider": ({ provider, nextProvider }) => `Katakana Translator: ${providerName(provider)} (switch to ${providerName(nextProvider)})`,
      "menu.language": "语言 / Language: 切换到简体中文",
      "error.localePersistence": ({ error }) => `Could not save the language setting: ${error}`,
      "error.translationProviderPersistence": ({ error }) => `Could not save the translation provider: ${error}. The previous provider remains active.`,
      "error.translationProviderRead": ({ error }) => `Could not read the translation provider setting. This page is using the locale-derived default: ${error}`,
      "error.kanjiRomajiModePersistence": ({ error }) => `Could not save the Kanji Romaji mode: ${error}. The previous mode remains active.`,
      "error.kanjiRomajiModeRead": ({ error }) => `Could not read the Kanji Romaji mode. This page is using Local Dictionary: ${error}`,
      "error.kanjiEnablePersistence": ({ error }) => `Could not save the Kanji Romaji setting: ${error}. The feature remains disabled.`,
      "error.kanjiDisablePersistence": ({ error }) => `Could not save the Kanji Romaji setting: ${error}. This page is disabled, but the feature may start again after reload.`,
      "error.katakanaEnablePersistence": ({ error }) => `Could not save the Online Katakana English setting: ${error}. The feature remains disabled.`,
      "error.katakanaDisablePersistence": ({ error }) => `Could not save the Online Katakana English setting: ${error}. This page is disabled, but the feature may start again after reload.`,
      "error.kanjiReadPersistence": ({ error }) => `Could not read the Kanji Romaji setting. The feature remains disabled: ${error}`,
      "error.katakanaReadPersistence": ({ error }) => `Could not read the Online Katakana English setting. The feature remains disabled: ${error}`,
      "error.kanjiStartup": ({ error }) => `Could not safely start Kanji Romaji: ${error}`,
      "error.katakanaStartup": ({ error }) => `Could not safely start Online Katakana English: ${error}`
    }),
    zh: Object.freeze({
      "menu.enableKanji": "开启本网站汉字罗马音",
      "menu.disableKanji": "关闭本网站汉字罗马音",
      "menu.kanjiRomajiMode": ({ mode, nextMode }) => `汉字罗马音模式：${kanjiModeName(mode, "zh")}（切换到${kanjiModeName(nextMode, "zh")}）`,
      "menu.enableKatakana": "开启本网站联网片假名英文",
      "menu.disableKatakana": "关闭本网站联网片假名英文",
      "menu.translationProvider": ({ provider, nextProvider }) => `片假名翻译服务：${providerName(provider)}（切换到 ${providerName(nextProvider)}）`,
      "menu.language": "语言 / Language: Switch to English",
      "error.localePersistence": ({ error }) => `无法保存语言设置：${error}`,
      "error.translationProviderPersistence": ({ error }) => `无法保存片假名翻译服务设置：${error}。继续使用原服务。`,
      "error.translationProviderRead": ({ error }) => `无法读取片假名翻译服务设置，本页使用语言对应的默认服务：${error}`,
      "error.kanjiRomajiModePersistence": ({ error }) => `无法保存汉字罗马音模式：${error}。继续使用原模式。`,
      "error.kanjiRomajiModeRead": ({ error }) => `无法读取汉字罗马音模式，本页使用本地字典：${error}`,
      "error.kanjiEnablePersistence": ({ error }) => `无法保存本网站汉字罗马音设置：${error}。功能保持关闭。`,
      "error.kanjiDisablePersistence": ({ error }) => `无法保存本网站汉字罗马音设置：${error}。本页已关闭，但刷新后可能再次启用。`,
      "error.katakanaEnablePersistence": ({ error }) => `无法保存本网站联网片假名英文设置：${error}。功能保持关闭。`,
      "error.katakanaDisablePersistence": ({ error }) => `无法保存本网站联网片假名英文设置：${error}。本页已关闭，但刷新后可能再次启用。`,
      "error.kanjiReadPersistence": ({ error }) => `无法读取本网站汉字罗马音设置，功能保持关闭：${error}`,
      "error.katakanaReadPersistence": ({ error }) => `无法读取本网站联网片假名英文设置，功能保持关闭：${error}`,
      "error.kanjiStartup": ({ error }) => `无法安全启动汉字罗马音：${error}`,
      "error.katakanaStartup": ({ error }) => `无法安全启动联网片假名英文：${error}`
    })
  });
  function providerName(provider) {
    return provider === "bing" ? "Bing" : "Google";
  }
  function kanjiModeName(mode, locale) {
    if (mode === "bing") {
      return "Bing";
    }
    if (mode === "local") {
      return locale === "zh" ? "本地字典" : "Local Dictionary";
    }
    return "Google";
  }
  function createLocalizer(initialLocale = "en", messages = MESSAGES) {
    let locale = isSupportedLocale(initialLocale) ? initialLocale : "en";
    return {
      getLocale: () => locale,
      setLocale(nextLocale) {
        locale = isSupportedLocale(nextLocale) ? nextLocale : "en";
      },
      t(key, values = {}) {
        const message = messages[locale]?.[key] ?? messages.en?.[key];
        if (message == null) {
          return key;
        }
        return typeof message === "function" ? message(values) : message;
      }
    };
  }
  async function initializeLocale({ getValue, setValue, primaryLanguage }) {
    let storedLocale;
    try {
      storedLocale = await getStoredLocale(getValue);
    } catch (persistenceError) {
      return { locale: "en", persistenceError };
    }
    if (isSupportedLocale(storedLocale)) {
      return { locale: storedLocale, persistenceError: null };
    }
    const locale = storedLocale == null && typeof primaryLanguage === "string" && primaryLanguage.toLowerCase().startsWith("zh") ? "zh" : "en";
    try {
      await setStoredLocale(setValue, locale);
      return { locale, persistenceError: null };
    } catch (persistenceError) {
      return { locale, persistenceError };
    }
  }

  // src/katakana-translation.js
  var ENDPOINT = "https://translate.googleapis.com/translate_a/single";
  var LATIN_LETTER2 = new RegExp("\\p{Script=Latin}", "u");
  function createGoogleTranslationClient({
    gmRequest,
    maxPhrasesPerRequest = 50,
    maxEncodedUrlLength = 1800,
    minimumIntervalMs = 250,
    requestTimeoutMs = 8e3,
    sleep = wait3
  }) {
    if (typeof gmRequest !== "function") {
      throw new TypeError("A GM_xmlhttpRequest adapter is required for katakana translation.");
    }
    return {
      async translatePhrases(phrases, { signal } = {}) {
        const uniquePhrases = [...new Set(phrases.filter((phrase) => typeof phrase === "string" && phrase))];
        if (uniquePhrases.length === 0) {
          return /* @__PURE__ */ new Map();
        }
        const translations = /* @__PURE__ */ new Map();
        const batches = buildBatches3(uniquePhrases, {
          maxPhrasesPerRequest,
          maxEncodedUrlLength
        });
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
          if (batchIndex > 0 && minimumIntervalMs > 0) {
            await sleep(minimumIntervalMs, { signal });
          }
          const batch = batches[batchIndex];
          const responseText = await requestTranslation(gmRequest, buildUrl(batch), {
            signal,
            timeout: requestTimeoutMs
          });
          for (const [original, translated] of parseTranslations2(responseText, batch)) {
            translations.set(original, translated);
          }
        }
        return translations;
      }
    };
  }
  function buildBatches3(phrases, { maxPhrasesPerRequest, maxEncodedUrlLength }) {
    if (!Number.isInteger(maxPhrasesPerRequest) || maxPhrasesPerRequest < 1) {
      throw new TypeError("maxPhrasesPerRequest must be a positive integer.");
    }
    if (!Number.isInteger(maxEncodedUrlLength) || maxEncodedUrlLength < 1) {
      throw new TypeError("maxEncodedUrlLength must be a positive integer.");
    }
    const batches = [];
    let batch = [];
    for (const phrase of phrases) {
      const candidate = [...batch, phrase];
      if (batch.length > 0 && (candidate.length > maxPhrasesPerRequest || buildUrl(candidate).length > maxEncodedUrlLength)) {
        batches.push(batch);
        batch = [];
      }
      if (buildUrl([phrase]).length > maxEncodedUrlLength) {
        continue;
      }
      batch.push(phrase);
    }
    if (batch.length > 0) {
      batches.push(batch);
    }
    return batches;
  }
  function buildUrl(phrases) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("dt", "t");
    url.searchParams.set("sl", "ja");
    url.searchParams.set("tl", "en");
    url.searchParams.set("q", phrases.join("\n"));
    return url.href;
  }
  function requestTranslation(gmRequest, url, { signal, timeout }) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError3());
        return;
      }
      let settled = false;
      let handle;
      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        callback(value);
      };
      const onAbort = () => {
        handle?.abort?.();
        finish(reject, abortError3());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      handle = gmRequest({
        method: "GET",
        url,
        timeout,
        anonymous: true,
        onload(response) {
          if (response?.status && (response.status < 200 || response.status >= 300)) {
            finish(reject, new Error(`Google Translate returned HTTP ${response.status}.`));
            return;
          }
          finish(resolve, response?.responseText ?? "");
        },
        onerror(response) {
          finish(reject, new Error(response?.statusText || "Google Translate request failed."));
        },
        ontimeout() {
          finish(reject, new Error("Google Translate request timed out."));
        },
        onabort() {
          finish(reject, abortError3());
        }
      });
    });
  }
  function parseTranslations2(responseText, requestedPhrases) {
    const payload = JSON.parse(responseText);
    if (!Array.isArray(payload?.[0])) {
      return /* @__PURE__ */ new Map();
    }
    const requested = new Set(requestedPhrases);
    const translations = /* @__PURE__ */ new Map();
    const ambiguous = /* @__PURE__ */ new Set();
    const seen = /* @__PURE__ */ new Set();
    for (const item of payload[0]) {
      const translated = typeof item?.[0] === "string" ? item[0].trim() : "";
      const original = typeof item?.[1] === "string" ? item[1].trim() : "";
      if (!requested.has(original)) {
        continue;
      }
      if (seen.has(original)) {
        translations.delete(original);
        ambiguous.add(original);
        continue;
      }
      seen.add(original);
      if (!ambiguous.has(original) && translated && translated !== original && LATIN_LETTER2.test(translated)) {
        translations.set(original, translated);
      }
    }
    return translations;
  }
  function abortError3() {
    return new DOMException("The katakana translation was aborted.", "AbortError");
  }
  function wait3(milliseconds, { signal } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError3());
        return;
      }
      const timer = setTimeout(finish, milliseconds);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(abortError3());
      };
      function finish() {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  // src/google-kanji-romaji.js
  var ENDPOINT2 = "https://translate.googleapis.com/translate_a/single";
  var BATCH_SEPARATOR = "🧩";
  var HAS_KANJI3 = new RegExp("\\p{Script=Han}", "u");
  var SAFE_ROMAJI2 = /^[A-Za-zĀĪŪĒŌāīūēō'’-]+$/u;
  var SAFE_BATCH_ROMAJI = /^[A-Za-zĀĪŪĒŌāīūēō'’ -]+$/u;
  function createGoogleKanjiRomajiClient({
    gmRequest,
    maxPhrasesPerRequest = 50,
    maxEncodedUrlLength = 1800,
    minimumIntervalMs = 250,
    requestTimeoutMs = 8e3,
    maxWordCharacters = 200,
    sleep = wait4
  }) {
    if (typeof gmRequest !== "function") {
      throw new TypeError("A GM_xmlhttpRequest adapter is required for Google kanji romaji.");
    }
    if (!Number.isInteger(maxPhrasesPerRequest) || maxPhrasesPerRequest < 1) {
      throw new TypeError("maxPhrasesPerRequest must be a positive integer.");
    }
    if (!Number.isInteger(maxEncodedUrlLength) || maxEncodedUrlLength < 1) {
      throw new TypeError("maxEncodedUrlLength must be a positive integer.");
    }
    let operationQueue = Promise.resolve();
    const romanizeWords = (words, { signal } = {}) => {
      const operation = operationQueue.then(async () => {
        throwIfAborted3(signal);
        const uniqueWords = [...new Set(words.filter((word) => isEligibleWord2(
          word,
          maxWordCharacters
        )))];
        const readings = /* @__PURE__ */ new Map();
        if (uniqueWords.length > 0) {
          let requestIndex = 0;
          const fetchUrl = async (requestedUrl) => {
            if (requestIndex > 0 && minimumIntervalMs > 0) {
              await sleep(minimumIntervalMs, { signal });
            }
            requestIndex += 1;
            const response = await request3(gmRequest, {
              method: "GET",
              url: requestedUrl.href,
              timeout: requestTimeoutMs,
              anonymous: true,
              redirect: "error"
            }, { signal });
            validateResponseUrl2(response.finalUrl ?? response.responseURL, requestedUrl);
            return response.responseText;
          };
          const batches = buildBatches4(uniqueWords, {
            maxPhrasesPerRequest,
            maxEncodedUrlLength
          });
          for (const batch of batches) {
            let batchReadings = null;
            if (batch.useFastPath) {
              const url = buildBatchUrl(batch.words);
              try {
                batchReadings = parseGoogleKanjiRomajiBatch(
                  await fetchUrl(url),
                  batch.words
                );
              } catch (error) {
                if (error?.name === "AbortError") {
                  throw error;
                }
              }
            }
            if (batchReadings) {
              for (const [word, romaji] of batchReadings) {
                readings.set(word, romaji);
              }
            } else {
              for (const word of batch.words) {
                const responseText = await fetchUrl(buildSingleWordUrl(word));
                const romaji = parseGoogleKanjiRomaji(responseText, word);
                if (romaji) {
                  readings.set(word, romaji);
                }
              }
            }
          }
        }
        return readings;
      });
      operationQueue = operation.catch(() => {
      });
      return operation;
    };
    return { romanizeWords };
  }
  function buildBatchUrl(words) {
    const url = new URL(ENDPOINT2);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "ja");
    url.searchParams.set("tl", "ja");
    url.searchParams.append("dt", "t");
    url.searchParams.append("dt", "rm");
    url.searchParams.set("q", words.join(BATCH_SEPARATOR));
    return url;
  }
  function buildSingleWordUrl(word) {
    const url = new URL(ENDPOINT2);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "ja");
    url.searchParams.set("tl", "en");
    url.searchParams.append("dt", "t");
    url.searchParams.append("dt", "rm");
    url.searchParams.set("q", word);
    return url;
  }
  function buildBatches4(words, { maxPhrasesPerRequest, maxEncodedUrlLength }) {
    const batches = [];
    let batch = [];
    const flushBatch = () => {
      if (batch.length > 0) {
        batches.push({ words: batch, useFastPath: true });
        batch = [];
      }
    };
    for (const word of words) {
      if (buildBatchUrl([word]).href.length > maxEncodedUrlLength) {
        flushBatch();
        batches.push({ words: [word], useFastPath: false });
        continue;
      }
      const candidate = [...batch, word];
      if (batch.length > 0 && (candidate.length > maxPhrasesPerRequest || buildBatchUrl(candidate).href.length > maxEncodedUrlLength)) {
        flushBatch();
      }
      batch.push(word);
    }
    flushBatch();
    return batches;
  }
  function parseGoogleKanjiRomajiBatch(responseText, words) {
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      return null;
    }
    if (!Array.isArray(payload) || !Array.isArray(payload[0]) || payload[2] !== "ja") {
      return null;
    }
    const sourceCandidates = [];
    const romajiCandidates = [];
    for (const item of payload[0]) {
      if (!Array.isArray(item)) {
        return null;
      }
      if (typeof item[1] === "string") {
        sourceCandidates.push(item[1]);
      }
      if (typeof item[2] === "string") {
        romajiCandidates.push(item[2]);
      }
    }
    const joinedSource = words.join(BATCH_SEPARATOR);
    if (sourceCandidates.length !== 1 || sourceCandidates[0] !== joinedSource || romajiCandidates.length !== 1) {
      return null;
    }
    const segments = romajiCandidates[0].split(BATCH_SEPARATOR).map((segment) => segment.trim());
    if (segments.length !== words.length) {
      return null;
    }
    const readings = /* @__PURE__ */ new Map();
    for (let index = 0; index < words.length; index += 1) {
      const romaji = segments[index];
      if (isSafeBatchRomaji(romaji)) {
        readings.set(words[index], romaji);
      }
    }
    return readings;
  }
  function parseGoogleKanjiRomaji(responseText, word) {
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      return null;
    }
    if (!Array.isArray(payload) || !Array.isArray(payload[0]) || payload[2] !== "ja") {
      return null;
    }
    const sourceFragments = [];
    const romajiCandidates = [];
    for (const item of payload[0]) {
      if (!Array.isArray(item)) {
        return null;
      }
      if (typeof item[0] === "string" && typeof item[1] === "string") {
        sourceFragments.push(item[1]);
      }
      if (typeof item[3] === "string") {
        romajiCandidates.push(item[3]);
      }
    }
    if (sourceFragments.join("") !== word || romajiCandidates.length !== 1) {
      return null;
    }
    const romaji = romajiCandidates[0];
    return isSafeRomaji2(romaji) ? romaji : null;
  }
  function isSafeRomaji2(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 1e3 && value === value.trim() && SAFE_ROMAJI2.test(value);
  }
  function isSafeBatchRomaji(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 1e3 && value === value.trim() && !value.includes(BATCH_SEPARATOR) && SAFE_BATCH_ROMAJI.test(value);
  }
  function isEligibleWord2(word, maxWordCharacters) {
    return typeof word === "string" && word.length > 0 && word.length <= maxWordCharacters && word === word.trim() && !/[\r\n\u0000-\u001f\u007f]/u.test(word) && !word.includes(BATCH_SEPARATOR) && HAS_KANJI3.test(word);
  }
  function validateResponseUrl2(value, requestedUrl) {
    let finalUrl;
    try {
      finalUrl = new URL(value);
    } catch {
      throw new Error("Google kanji romaji returned no valid final URL.");
    }
    if (finalUrl.href !== requestedUrl.href) {
      throw new Error("Google kanji romaji redirected away from the approved request URL.");
    }
  }
  function request3(gmRequest, options, { signal }) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError4());
        return;
      }
      let settled = false;
      let handle;
      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        callback(value);
      };
      const onAbort = () => {
        handle?.abort?.();
        finish(reject, abortError4());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      handle = gmRequest({
        ...options,
        onload(response) {
          if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
            const status = Number.isInteger(response?.status) ? response.status : "unknown";
            finish(reject, new Error(`Google kanji romaji returned HTTP ${status}.`));
            return;
          }
          finish(resolve, response ?? {});
        },
        onerror(response) {
          finish(reject, new Error(response?.statusText || "Google kanji romaji request failed."));
        },
        ontimeout() {
          finish(reject, new Error("Google kanji romaji request timed out."));
        },
        onabort() {
          finish(reject, abortError4());
        }
      });
    });
  }
  function throwIfAborted3(signal) {
    if (signal?.aborted) {
      throw abortError4();
    }
  }
  function abortError4() {
    return new DOMException("Google kanji romaji was aborted.", "AbortError");
  }
  function wait4(milliseconds, { signal } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError4());
        return;
      }
      const timer = setTimeout(finish, milliseconds);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(abortError4());
      };
      function finish() {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  // src/online-kanji-analyzer.js
  var HAS_KANJI4 = new RegExp("\\p{Script=Han}", "u");
  function createOnlineKanjiAnalyzer({
    romanizeWords,
    Segmenter = globalThis.Intl?.Segmenter
  }) {
    if (typeof romanizeWords !== "function") {
      throw new TypeError("An online kanji romanization function is required.");
    }
    if (typeof Segmenter !== "function") {
      throw new TypeError("Local Intl.Segmenter support is required for online kanji romaji.");
    }
    const segmenter = new Segmenter("ja", { granularity: "word" });
    const readingCache = /* @__PURE__ */ new Map();
    const pendingReadings = /* @__PURE__ */ new Map();
    return async function analyzeOnlineKanji(text, { signal } = {}) {
      if (typeof text !== "string" || text.length === 0) {
        return [];
      }
      const entries = [...segmenter.segment(text)];
      if (!segmentsExactlyCoverText(text, entries)) {
        return [{ type: "text", text }];
      }
      const candidates = [...new Set(entries.filter(({ segment, isWordLike }) => isWordLike === true && HAS_KANJI4.test(segment)).map(({ segment }) => segment))];
      if (candidates.length === 0) {
        return [{ type: "text", text }];
      }
      let readings;
      try {
        readings = await resolveReadings(candidates, signal);
      } catch (error) {
        if (error?.name === "AbortError") {
          throw error;
        }
        return [{ type: "text", text }];
      }
      if (!(readings instanceof Map)) {
        return [{ type: "text", text }];
      }
      const result = [];
      for (const { segment, isWordLike } of entries) {
        const romaji = isWordLike === true && HAS_KANJI4.test(segment) ? readings.get(segment) : null;
        if (typeof romaji === "string" && romaji.length > 0) {
          result.push({ type: "annotation", surface: segment, romaji });
        } else {
          appendText2(result, segment);
        }
      }
      return result;
    };
    async function resolveReadings(candidates, signal) {
      const missing = candidates.filter((word) => !readingCache.has(word) && !pendingReadings.has(word));
      if (missing.length > 0) {
        const operation = Promise.resolve().then(() => romanizeWords(missing, { signal }));
        for (const word of missing) {
          let pending;
          pending = operation.then(
            (result) => result instanceof Map && typeof result.get(word) === "string" ? result.get(word) : null,
            (error) => {
              if (error?.name === "AbortError") {
                throw error;
              }
              return null;
            }
          ).then((reading) => {
            readingCache.set(word, reading);
            return reading;
          }).finally(() => {
            if (pendingReadings.get(word) === pending) {
              pendingReadings.delete(word);
            }
          });
          pendingReadings.set(word, pending);
        }
      }
      const readings = /* @__PURE__ */ new Map();
      await Promise.all(candidates.map(async (word) => {
        const reading = readingCache.has(word) ? readingCache.get(word) : await pendingReadings.get(word);
        if (typeof reading === "string" && reading.length > 0) {
          readings.set(word, reading);
        }
      }));
      return readings;
    }
  }
  function segmentsExactlyCoverText(text, entries) {
    let cursor = 0;
    for (const entry of entries) {
      if (typeof entry?.segment !== "string" || !Number.isInteger(entry.index) || entry.index !== cursor || text.slice(cursor, cursor + entry.segment.length) !== entry.segment) {
        return false;
      }
      cursor += entry.segment.length;
    }
    return cursor === text.length;
  }
  function appendText2(segments, text) {
    if (!text) {
      return;
    }
    const last = segments.at(-1);
    if (last?.type === "text") {
      last.text += text;
    } else {
      segments.push({ type: "text", text });
    }
  }

  // src/kanji-runtime.js
  var KanjiRuntime = class {
    constructor({ mode, analyzerFactories, onPlanChanged = () => {
    } }) {
      if (!analyzerFactories || typeof analyzerFactories[mode] !== "function") {
        throw new TypeError(`No kanji analyzer adapter is available for mode: ${mode}`);
      }
      this.mode = mode;
      this.analyzerFactories = analyzerFactories;
      this.onPlanChanged = onPlanChanged;
      this.active = false;
      this.paused = false;
      this.analyzer = null;
      this.generation = 0;
      this.abortController = null;
      this.cache = /* @__PURE__ */ new Map();
      this.queue = [];
      this.processing = false;
    }
    async enable() {
      if (this.active) {
        return;
      }
      const generation = ++this.generation;
      const abortController = new AbortController();
      this.abortController = abortController;
      this.#clearCycle();
      const analyzer = await this.analyzerFactories[this.mode]({ signal: abortController.signal });
      if (generation !== this.generation || abortController.signal.aborted) {
        return;
      }
      if (typeof analyzer !== "function") {
        throw new TypeError("The kanji analyzer adapter must be a function.");
      }
      this.analyzer = analyzer;
      this.active = true;
    }
    disable() {
      this.generation += 1;
      this.abortController?.abort();
      this.abortController = null;
      this.active = false;
      this.analyzer = null;
      this.#clearCycle();
    }
    async setMode(mode) {
      if (typeof this.analyzerFactories[mode] !== "function") {
        throw new TypeError(`No kanji analyzer adapter is available for mode: ${mode}`);
      }
      if (mode === this.mode) {
        return;
      }
      const wasActive = this.active;
      this.disable();
      this.mode = mode;
      if (wasActive) {
        await this.enable();
      }
    }
    pause() {
      this.paused = true;
    }
    resume() {
      this.paused = false;
      this.#drain();
    }
    plan(record) {
      const text = record?.text;
      if (!this.active || typeof text !== "string" || text.length === 0) {
        return emptyPlan("inactive");
      }
      let entry = this.cache.get(text);
      if (!entry) {
        entry = { status: "pending", ranges: [], waiters: /* @__PURE__ */ new Set() };
        this.cache.set(text, entry);
        this.queue.push(text);
      }
      if (entry.status === "pending") {
        entry.waiters.add(record);
      }
      this.#drain();
      return { status: entry.status, ranges: entry.ranges };
    }
    forget(record) {
      for (const entry of this.cache.values()) {
        entry.waiters?.delete(record);
      }
    }
    stop() {
      this.disable();
    }
    #drain() {
      if (!this.active || this.paused || this.processing || this.queue.length === 0) {
        return;
      }
      const text = this.queue.shift();
      const entry = this.cache.get(text);
      if (!entry || entry.status !== "pending") {
        this.#drain();
        return;
      }
      const generation = this.generation;
      const analyzer = this.analyzer;
      const signal = this.abortController?.signal;
      let result;
      try {
        result = analyzer(text, { signal });
      } catch {
        this.#finish(text, entry, generation, []);
        return;
      }
      if (!result || typeof result.then !== "function") {
        this.#finish(text, entry, generation, annotationRanges(text, result));
        return;
      }
      this.processing = true;
      void Promise.resolve(result).then(
        (segments) => this.#finish(text, entry, generation, annotationRanges(text, segments)),
        () => this.#finish(text, entry, generation, [])
      );
    }
    #finish(text, entry, generation, ranges) {
      this.processing = false;
      if (generation !== this.generation || !this.active || this.cache.get(text) !== entry || this.abortController?.signal.aborted) {
        this.#drain();
        return;
      }
      entry.status = ranges.length > 0 ? "success" : "failure";
      entry.ranges = ranges;
      const waiters = [...entry.waiters];
      entry.waiters.clear();
      for (const record of waiters) {
        this.onPlanChanged(record);
      }
      this.#drain();
    }
    #clearCycle() {
      this.cache.clear();
      this.queue.length = 0;
      this.processing = false;
    }
  };
  function annotationRanges(text, segments) {
    if (!Array.isArray(segments)) {
      return [];
    }
    const ranges = [];
    let cursor = 0;
    for (const segment of segments) {
      const surface = segment?.type === "annotation" ? segment.surface : segment?.text;
      if (typeof surface !== "string" || text.slice(cursor, cursor + surface.length) !== surface) {
        return [];
      }
      if (segment.type === "annotation" && typeof segment.romaji === "string" && segment.romaji.length > 0) {
        ranges.push({
          start: cursor,
          end: cursor + surface.length,
          text: surface,
          reading: segment.reading,
          romaji: segment.romaji
        });
      }
      cursor += surface.length;
    }
    return cursor === text.length ? ranges : [];
  }
  function emptyPlan(status) {
    return { status, ranges: [] };
  }

  // src/katakana-runtime.js
  var KatakanaRuntime = class {
    constructor({ provider, translatorFactories, onPlanChanged = () => {
    } }) {
      if (!translatorFactories || typeof translatorFactories[provider] !== "function") {
        throw new TypeError(`No katakana translation adapter is available for provider: ${provider}`);
      }
      this.provider = provider;
      this.translatorFactories = translatorFactories;
      this.onPlanChanged = onPlanChanged;
      this.active = false;
      this.paused = false;
      this.translator = null;
      this.generation = 0;
      this.abortController = null;
      this.cache = /* @__PURE__ */ new Map();
      this.queue = [];
      this.flushScheduled = false;
      this.processing = false;
    }
    async enable() {
      if (this.active) {
        return;
      }
      const generation = ++this.generation;
      const abortController = new AbortController();
      this.abortController = abortController;
      this.#clearCycle();
      const translator = await this.translatorFactories[this.provider]();
      if (generation !== this.generation || abortController.signal.aborted) {
        return;
      }
      if (typeof translator !== "function") {
        throw new TypeError("The katakana translation adapter must be a function.");
      }
      this.translator = translator;
      this.active = true;
    }
    disable() {
      this.generation += 1;
      this.abortController?.abort();
      this.abortController = null;
      this.active = false;
      this.translator = null;
      this.#clearCycle();
    }
    async setProvider(provider) {
      if (typeof this.translatorFactories[provider] !== "function") {
        throw new TypeError(`No katakana translation adapter is available for provider: ${provider}`);
      }
      if (provider === this.provider) {
        return;
      }
      const wasActive = this.active;
      this.disable();
      this.provider = provider;
      if (wasActive) {
        await this.enable();
      }
    }
    pause() {
      this.paused = true;
    }
    resume() {
      this.paused = false;
      this.#scheduleFlush();
    }
    plan(record) {
      const text = record?.text;
      if (!this.active || typeof text !== "string" || text.length === 0) {
        return { status: "inactive", ranges: [], reservations: [] };
      }
      const matches = findKatakanaMatches(text);
      let added = false;
      for (const match of matches) {
        let entry = this.cache.get(match.text);
        if (!entry) {
          entry = { status: "pending", translation: null, waiters: /* @__PURE__ */ new Set() };
          this.cache.set(match.text, entry);
          this.queue.push(match.text);
          added = true;
        }
        if (entry.status === "pending") {
          entry.waiters.add(record);
        }
      }
      if (added) {
        this.#scheduleFlush();
      }
      const ranges = [];
      const reservations = [];
      for (const match of matches) {
        const entry = this.cache.get(match.text);
        if (entry?.status === "success") {
          ranges.push({ ...match, annotation: entry.translation });
          reservations.push(match);
        } else if (entry?.status === "pending") {
          reservations.push(match);
        }
      }
      const status = reservations.some((match) => this.cache.get(match.text)?.status === "pending") ? "pending" : ranges.length > 0 ? "success" : matches.length > 0 ? "failure" : "success";
      return { status, ranges, reservations };
    }
    forget(record) {
      for (const entry of this.cache.values()) {
        entry.waiters?.delete(record);
      }
    }
    stop() {
      this.disable();
    }
    #scheduleFlush() {
      if (!this.active || this.paused || this.processing || this.flushScheduled || this.queue.length === 0) {
        return;
      }
      this.flushScheduled = true;
      queueMicrotask(() => {
        this.flushScheduled = false;
        this.#flush();
      });
    }
    #flush() {
      if (!this.active || this.paused || this.processing || this.queue.length === 0) {
        return;
      }
      const phrases = this.queue.splice(0);
      const generation = this.generation;
      const translator = this.translator;
      const signal = this.abortController?.signal;
      this.processing = true;
      void Promise.resolve().then(() => translator(phrases, { signal })).then(
        (translations) => this.#finish(phrases, generation, translations),
        () => this.#finish(phrases, generation, /* @__PURE__ */ new Map())
      );
    }
    #finish(phrases, generation, translations) {
      this.processing = false;
      if (generation !== this.generation || !this.active || this.abortController?.signal.aborted) {
        this.#scheduleFlush();
        return;
      }
      const affected = /* @__PURE__ */ new Set();
      for (const phrase of phrases) {
        const entry = this.cache.get(phrase);
        if (!entry || entry.status !== "pending") {
          continue;
        }
        const translation = translations instanceof Map ? translations.get(phrase) : null;
        entry.status = typeof translation === "string" && translation.length > 0 ? "success" : "failure";
        entry.translation = entry.status === "success" ? translation : null;
        for (const record of entry.waiters) {
          affected.add(record);
        }
        entry.waiters.clear();
      }
      for (const record of affected) {
        this.onPlanChanged(record);
      }
      this.#scheduleFlush();
    }
    #clearCycle() {
      this.cache.clear();
      this.queue.length = 0;
      this.flushScheduled = false;
      this.processing = false;
    }
  };

  // src/styles.js
  var STYLES = `
ruby.yomi-ruby-ruby {
  position: relative !important;
  ruby-position: over;
  ruby-align: center;
}
ruby.yomi-ruby-ruby > rt.yomi-ruby-rt,
rt.yomi-ruby-existing-rt {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  font-size: 0.55em !important;
  font-weight: 500 !important;
  line-height: 1 !important;
  user-select: none !important;
}
ruby.yomi-ruby-ruby:focus-visible {
  outline: 2px solid Highlight !important;
  outline-offset: 2px !important;
}
ruby.yomi-ruby-ruby[data-yomi-ruby-kana]:hover::after,
ruby.yomi-ruby-ruby[data-yomi-ruby-kana]:focus-visible::after {
  content: attr(data-yomi-ruby-kana);
  position: absolute;
  z-index: 2147483647;
  left: 50%;
  bottom: calc(100% + 1.4em);
  transform: translateX(-50%);
  padding: 0.2em 0.4em;
  border-radius: 0.3em;
  background: rgba(24, 24, 27, 0.94);
  color: white;
  font: 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  white-space: nowrap;
  pointer-events: none;
}
[data-yomi-ruby-status] {
  position: fixed !important;
  z-index: 2147483647 !important;
  right: 16px !important;
  bottom: 16px !important;
  max-width: min(420px, calc(100vw - 32px)) !important;
  padding: 10px 14px !important;
  border-radius: 8px !important;
  background: rgba(24, 24, 27, 0.94) !important;
  color: #fff !important;
  font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25) !important;
}
`;
  function installStyles(document2) {
    const style = document2.createElement("style");
    style.setAttribute("data-yomi-ruby-style", "");
    style.textContent = STYLES;
    document2.documentElement.append(style);
    return () => style.remove();
  }

  // src/session.js
  function createYomiRubySession({
    document: document2,
    coordinator: coordinator2,
    kanjiMode = "local",
    kanjiAnalyzerFactories,
    translationProvider = "google",
    translationProviderFactories,
    translatePhrases = null,
    installSessionStyles = installStyles,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
    logger = globalThis.console,
    localizer: localizer2 = createLocalizer("en")
  }) {
    if (!document2 || !coordinator2 || !kanjiAnalyzerFactories) {
      throw new TypeError("A document, coordinator, and kanji analyzer adapters are required.");
    }
    const resolvedTranslationFactories = translationProviderFactories ?? (typeof translatePhrases === "function" ? { [translationProvider]: () => translatePhrases } : null);
    if (!resolvedTranslationFactories) {
      throw new TypeError("Katakana translation adapters are required.");
    }
    const kanjiRuntime = new KanjiRuntime({
      mode: kanjiMode,
      analyzerFactories: kanjiAnalyzerFactories,
      onPlanChanged: (record) => coordinator2.refresh(record)
    });
    const katakanaRuntime = new KatakanaRuntime({
      provider: translationProvider,
      translatorFactories: resolvedTranslationFactories,
      onPlanChanged: (record) => coordinator2.refresh(record)
    });
    let kanjiActive = false;
    let kanjiDesired = false;
    let katakanaActive = false;
    let removeStyles = null;
    let statusElement = null;
    let statusTimer = null;
    const kanji = {
      async enable() {
        if (kanjiActive) {
          return;
        }
        kanjiDesired = true;
        ensureStyles();
        try {
          await kanjiRuntime.enable();
          if (!kanjiDesired || !kanjiRuntime.active) {
            return;
          }
          coordinator2.enableKanji(kanjiRuntime);
          kanjiActive = true;
        } catch (error) {
          kanjiDesired = false;
          kanjiRuntime.disable();
          coordinator2.disableKanji();
          showStartupError("kanji", error);
        } finally {
          removeStylesIfUnused();
        }
      },
      disable() {
        kanjiDesired = false;
        kanjiActive = false;
        coordinator2.disableKanji();
        kanjiRuntime.disable();
        removeStatus();
        removeStylesIfUnused();
      },
      async setMode(mode) {
        if (!kanjiActive) {
          await kanjiRuntime.setMode(mode);
          return;
        }
        coordinator2.disableKanji();
        kanjiActive = false;
        try {
          await kanjiRuntime.setMode(mode);
          if (kanjiRuntime.active && kanjiDesired) {
            coordinator2.enableKanji(kanjiRuntime);
            kanjiActive = true;
          }
        } catch (error) {
          kanjiDesired = false;
          kanjiRuntime.disable();
          showStartupError("kanji", error);
        } finally {
          removeStylesIfUnused();
        }
      }
    };
    const katakana = {
      async enable() {
        if (katakanaActive) {
          return;
        }
        ensureStyles();
        try {
          await katakanaRuntime.enable();
          if (!katakanaRuntime.active) {
            return;
          }
          coordinator2.enableKatakana(katakanaRuntime);
          katakanaActive = true;
        } catch (error) {
          katakanaRuntime.disable();
          coordinator2.disableKatakana();
          showStartupError("katakana", error);
        } finally {
          removeStylesIfUnused();
        }
      },
      disable() {
        katakanaActive = false;
        coordinator2.disableKatakana();
        katakanaRuntime.disable();
        removeStatus();
        removeStylesIfUnused();
      },
      async setProvider(provider) {
        if (!katakanaActive) {
          await katakanaRuntime.setProvider(provider);
          return;
        }
        coordinator2.disableKatakana();
        katakanaActive = false;
        try {
          await katakanaRuntime.setProvider(provider);
          if (katakanaRuntime.active) {
            coordinator2.enableKatakana(katakanaRuntime);
            katakanaActive = true;
          }
        } catch (error) {
          katakanaRuntime.disable();
          showStartupError("katakana", error);
        } finally {
          removeStylesIfUnused();
        }
      }
    };
    function showStartupError(feature, error) {
      showStatus(localizer2.t(`error.${feature}Startup`, { error: errorMessage2(error) }), {
        duration: 9e3,
        error: true
      });
      logger?.error?.(`[YomiRuby] Refused to start ${feature} annotation`, error);
    }
    function showStatus(message, { duration = 4e3, error = false } = {}) {
      removeStatus();
      ensureStyles();
      const element = document2.createElement("div");
      element.setAttribute("data-yomi-ruby-status", "");
      element.setAttribute("role", error ? "alert" : "status");
      element.textContent = message;
      (document2.body ?? document2.documentElement).append(element);
      statusElement = element;
      if (duration > 0) {
        statusTimer = setTimer(removeStatus, duration);
      }
    }
    function ensureStyles() {
      removeStyles ??= installSessionStyles(document2);
    }
    function removeStatus() {
      if (statusTimer != null) {
        clearTimer(statusTimer);
      }
      statusTimer = null;
      statusElement?.remove();
      statusElement = null;
      removeStylesIfUnused();
    }
    function removeStylesIfUnused() {
      if (!kanjiActive && !kanjiDesired && !katakanaActive && !statusElement) {
        removeStyles?.();
        removeStyles = null;
      }
    }
    function stop() {
      kanjiDesired = false;
      kanjiActive = false;
      katakanaActive = false;
      kanjiRuntime.stop();
      katakanaRuntime.stop();
      coordinator2.stop();
      removeStatus();
      removeStyles?.();
      removeStyles = null;
    }
    return { kanji, katakana, showStatus, stop, kanjiRuntime, katakanaRuntime };
  }
  function errorMessage2(error) {
    return error instanceof Error ? error.message : String(error);
  }

  // src/static-tokenizer.js
  var import_Tokenizer = __toESM(require_Tokenizer(), 1);
  var import_DynamicDictionaries = __toESM(require_DynamicDictionaries(), 1);
  var import_gunzip_min = __toESM(require_gunzip_min(), 1);
  function buildStaticTokenizer(dictionaryFiles) {
    const dictionaries = new import_DynamicDictionaries.default();
    dictionaries.loadTrie(
      new Int32Array(decompress(dictionaryFiles, "base.dat.gz")),
      new Int32Array(decompress(dictionaryFiles, "check.dat.gz"))
    );
    dictionaries.loadTokenInfoDictionaries(
      new Uint8Array(decompress(dictionaryFiles, "tid.dat.gz")),
      new Uint8Array(decompress(dictionaryFiles, "tid_pos.dat.gz")),
      new Uint8Array(decompress(dictionaryFiles, "tid_map.dat.gz"))
    );
    dictionaries.loadConnectionCosts(new Int16Array(decompress(dictionaryFiles, "cc.dat.gz")));
    dictionaries.loadUnknownDictionaries(
      new Uint8Array(decompress(dictionaryFiles, "unk.dat.gz")),
      new Uint8Array(decompress(dictionaryFiles, "unk_pos.dat.gz")),
      new Uint8Array(decompress(dictionaryFiles, "unk_map.dat.gz")),
      new Uint8Array(decompress(dictionaryFiles, "unk_char.dat.gz")),
      new Uint32Array(decompress(dictionaryFiles, "unk_compat.dat.gz")),
      new Uint8Array(decompress(dictionaryFiles, "unk_invoke.dat.gz"))
    );
    return new import_Tokenizer.default(dictionaries);
  }
  function decompress(dictionaryFiles, name) {
    const compressed = dictionaryFiles.get(name);
    if (!(compressed instanceof ArrayBuffer)) {
      throw new Error(`Verified dictionary asset not found: ${name}`);
    }
    const gunzip = new import_gunzip_min.default.Zlib.Gunzip(new Uint8Array(compressed));
    const bytes = gunzip.decompress();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  // src/vendor-loader.js
  async function loadVerifiedKuromoji({
    manifest,
    getResourceUrl,
    gmRequest,
    subtle = globalThis.crypto?.subtle,
    signal
  }) {
    if (!Array.isArray(manifest?.dictionary)) {
      throw new TypeError("A valid vendor manifest is required.");
    }
    if (typeof gmRequest !== "function") {
      throw new TypeError("GM_xmlhttpRequest is required for verified asset loading.");
    }
    if (!subtle) {
      throw new Error("Web Crypto SHA-256 is unavailable; refusing to load dictionary assets.");
    }
    throwIfAborted4(signal);
    const dictionaryEntries = await Promise.all(
      manifest.dictionary.map(async (asset) => [
        asset.name,
        await readAndVerifyResource(asset, getResourceUrl, gmRequest, subtle, signal)
      ])
    );
    const dictionaryFiles = new Map(dictionaryEntries);
    try {
      throwIfAborted4(signal);
      const tokenizer = buildStaticTokenizer(dictionaryFiles);
      throwIfAborted4(signal);
      return tokenizer;
    } finally {
      dictionaryFiles.clear();
    }
  }
  async function readAndVerifyResource(asset, getResourceUrl, gmRequest, subtle = globalThis.crypto?.subtle, signal) {
    throwIfAborted4(signal);
    validateAssetRecord(asset);
    if (!asset.resourceName || typeof asset.resourceName !== "string") {
      throw new Error(`Missing preloaded resource name for ${asset.name}`);
    }
    if (typeof getResourceUrl !== "function") {
      throw new TypeError("GM_getResourceURL is required for preloaded dictionary access.");
    }
    const resourceUrl = getResourceUrl(asset.resourceName);
    validateLocalResourceUrl(resourceUrl, asset.resourceName);
    const bytes = await gmArrayBufferRequest(resourceUrl, gmRequest, signal);
    return verifyAssetBytes(asset, bytes, subtle, signal);
  }
  async function verifyAssetBytes(asset, bytes, subtle, signal) {
    throwIfAborted4(signal);
    if (bytes.byteLength !== asset.size) {
      throw new Error(`Size mismatch for ${asset.name}: expected ${asset.size}, received ${bytes.byteLength}`);
    }
    const digest = toHex(await subtle.digest("SHA-256", bytes));
    throwIfAborted4(signal);
    if (digest !== asset.sha256) {
      throw new Error(`SHA-256 mismatch for ${asset.name}: expected ${asset.sha256}, received ${digest}`);
    }
    return bytes;
  }
  function validateLocalResourceUrl(resourceUrl, resourceName) {
    if (typeof resourceUrl !== "string" || resourceUrl.length === 0) {
      throw new Error(`Preloaded resource unavailable: ${resourceName}`);
    }
    let protocol;
    try {
      protocol = new URL(resourceUrl).protocol;
    } catch {
      throw new Error(`Invalid preloaded resource URL for ${resourceName}`);
    }
    if (!["blob:", "data:", "chrome-extension:", "moz-extension:"].includes(protocol)) {
      throw new Error(`Refusing non-local preloaded resource URL for ${resourceName}`);
    }
  }
  function validateAssetRecord(asset) {
    if (!asset.name || !Number.isSafeInteger(asset.size) || asset.size < 0 || !/^[0-9a-f]{64}$/u.test(asset.sha256)) {
      throw new Error(`Invalid manifest entry for ${asset?.name ?? "unnamed asset"}`);
    }
  }
  function gmArrayBufferRequest(url, gmRequest, signal) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let requestHandle;
      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        signal?.removeEventListener("abort", onSignalAbort);
        callback(value);
      };
      const rejectAbort = () => finish(reject, new Error(`Asset request aborted for ${url}`));
      const onSignalAbort = () => {
        try {
          requestHandle?.abort?.();
        } finally {
          rejectAbort();
        }
      };
      if (signal?.aborted) {
        rejectAbort();
        return;
      }
      signal?.addEventListener("abort", onSignalAbort, { once: true });
      try {
        requestHandle = gmRequest({
          method: "GET",
          url,
          responseType: "arraybuffer",
          timeout: 12e4,
          anonymous: true,
          onload(response) {
            const localSuccess = response.status === 0 || response.status >= 200 && response.status < 300;
            if (!localSuccess || !(response.response instanceof ArrayBuffer)) {
              finish(reject, new Error(`Asset request failed for ${url}: HTTP ${response.status}`));
              return;
            }
            finish(resolve, response.response);
          },
          onerror: () => finish(reject, new Error(`Network error while requesting ${url}`)),
          ontimeout: () => finish(reject, new Error(`Timed out while requesting ${url}`)),
          onabort: rejectAbort
        });
        if (signal?.aborted) {
          onSignalAbort();
        }
      } catch (error) {
        finish(reject, error);
      }
    });
  }
  function throwIfAborted4(signal) {
    if (signal?.aborted) {
      throw new Error("Asset loading aborted.");
    }
  }
  function toHex(buffer) {
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // src/main.js
  var coordinator = new AnnotationCoordinator({ document });
  var localizer = createLocalizer("en");
  void bootstrap();
  async function bootstrap() {
    const primaryLanguage = navigator.languages?.[0] ?? navigator.language;
    const {
      mode: kanjiRomajiMode,
      readError: kanjiRomajiModeReadError,
      persistenceError: kanjiRomajiModePersistenceError
    } = await initializeKanjiRomajiMode({
      getValue: GM_getValue,
      setValue: GM_setValue,
      primaryLanguage
    });
    const { locale, persistenceError } = await initializeLocale({
      getValue: GM_getValue,
      setValue: GM_setValue,
      primaryLanguage
    });
    localizer.setLocale(locale);
    const {
      provider,
      readError: translationProviderReadError,
      persistenceError: translationProviderPersistenceError
    } = await initializeTranslationProvider({
      getValue: GM_getValue,
      setValue: GM_setValue,
      locale
    });
    const translationProviderFactories = {
      bing: () => createBingTranslationClient({
        gmRequest: GM_xmlhttpRequest
      }).translatePhrases,
      google: () => createGoogleTranslationClient({
        gmRequest: GM_xmlhttpRequest
      }).translatePhrases
    };
    const kanjiAnalyzerFactories = {
      local: async ({ signal }) => createAnalyzer(await loadVerifiedKuromoji({
        manifest: runtime_manifest_default,
        getResourceUrl: GM_getResourceURL,
        gmRequest: GM_xmlhttpRequest,
        signal
      })),
      google: async () => createOnlineKanjiAnalyzer({
        romanizeWords: createGoogleKanjiRomajiClient({
          gmRequest: GM_xmlhttpRequest
        }).romanizeWords
      }),
      bing: async () => createOnlineKanjiAnalyzer({
        romanizeWords: createBingKanjiRomajiClient({
          gmRequest: GM_xmlhttpRequest
        }).romanizeWords
      })
    };
    const session = createYomiRubySession({
      document,
      coordinator,
      kanjiMode: kanjiRomajiMode,
      kanjiAnalyzerFactories,
      translationProvider: provider,
      translationProviderFactories,
      localizer
    });
    await installYomiRubyControls({
      origin: location.origin,
      registerMenuCommand: GM_registerMenuCommand,
      unregisterMenuCommand: GM_unregisterMenuCommand,
      getValue: GM_getValue,
      setValue: GM_setValue,
      addValueChangeListener: GM_addValueChangeListener,
      removeValueChangeListener: GM_removeValueChangeListener,
      localizer,
      localePersistenceError: persistenceError,
      kanjiRomajiMode,
      kanjiRomajiModeReadError,
      kanjiRomajiModePersistenceError,
      translationProvider: provider,
      translationProviderReadError,
      translationProviderPersistenceError,
      kanji: session.kanji,
      katakana: session.katakana,
      showStatus: session.showStatus
    });
  }
})();
