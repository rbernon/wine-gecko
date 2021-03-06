#!/usr/bin/python
# Copyright 2015 The ANGLE Project Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
#
# gen_swizzle_format_table.py:
#  Code generation for the swizzle format table used for texture formats
#

import json
import pprint

template = """// GENERATED FILE - DO NOT EDIT
// Generated by gen_swizzle_format_table.py using data from swizzle_format_data.json
//
// Copyright 2015 The ANGLE Project Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// swizzle_format_info:
//   Provides information for swizzle format and a map from type->formatinfo
//

#include "libANGLE/renderer/d3d/d3d11/swizzle_format_info.h"

#include <GLES3/gl3.h>

namespace rx
{{

namespace d3d11
{{

SwizzleSizeType::SwizzleSizeType() : maxComponentSize(0), componentType(GL_NONE)
{{
}}

SwizzleSizeType::SwizzleSizeType(size_t maxComponentSize, GLenum componentType)
    : maxComponentSize(maxComponentSize), componentType(componentType)
{{
}}

bool SwizzleSizeType::operator<(const SwizzleSizeType &other) const
{{
    return (maxComponentSize != other.maxComponentSize)
               ? (maxComponentSize < other.maxComponentSize)
               : (componentType < other.componentType);
}}

SwizzleFormatInfo::SwizzleFormatInfo()
    : mTexFormat(DXGI_FORMAT_UNKNOWN),
      mSRVFormat(DXGI_FORMAT_UNKNOWN),
      mRTVFormat(DXGI_FORMAT_UNKNOWN)
{{
}}

SwizzleFormatInfo::SwizzleFormatInfo(DXGI_FORMAT texFormat,
                                     DXGI_FORMAT srvFormat,
                                     DXGI_FORMAT rtvFormat)
    : mTexFormat(texFormat), mSRVFormat(srvFormat), mRTVFormat(rtvFormat)
{{
}}

const SwizzleFormatInfo &GetSwizzleFormatInfo(GLuint maxBits, GLenum componentType)
{{
    // clang-format off
    switch ({component_type_param})
    {{
{data}
        default:
        {{
            static const SwizzleFormatInfo defaultInfo(DXGI_FORMAT_UNKNOWN,
                                                       DXGI_FORMAT_UNKNOWN,
                                                       DXGI_FORMAT_UNKNOWN);
            return defaultInfo;
        }}
    }}
    // clang-format on

}}  // GetSwizzleFormatInfo

}}  // namespace d3d11

}}  // namespace rx
"""

max_bits_param = 'maxBits'
component_type_param = 'componentType'

tex_format_key = 'texFormat'
srv_format_key = 'srvFormat'
rtv_format_key = 'rtvFormat'


def parse_json_into_switch_string(json_data):
    table_data = ''
    for component_type in sorted(json_data.items()):
        type_str = component_type[0]
        table_data += '        case ' + type_str + ':\n'
        table_data += '        {\n'

        table_data += '            switch (' + max_bits_param + ')\n'
        table_data += '            {\n'

        for max_width_item in sorted(json_data[type_str].items()):
            max_width = max_width_item[0]
            table_data += '                case ' + max_width + ':\n'
            table_data += '                {\n'
            table_data += '                    static const SwizzleFormatInfo formatInfo(' + json_data[type_str][max_width][tex_format_key] + ',\n'
            table_data += '                                                              ' + json_data[type_str][max_width][srv_format_key] + ',\n'
            table_data += '                                                              ' + json_data[type_str][max_width][rtv_format_key] + ');\n'
            table_data += '                    return formatInfo;\n'

            table_data += '                }\n'
        table_data += '                default:\n'
        table_data += '                    break;\n'
        table_data += '            }\n'
        table_data += '        }\n'

    return table_data

with open('swizzle_format_data.json') as functions_json_file:
    functions_data = functions_json_file.read();
    functions_json_file.close()
    json_data = json.loads(functions_data)

    table_data = parse_json_into_switch_string(json_data)
    output = template.format(component_type_param=component_type_param,
                             data=table_data)

    with open('swizzle_format_info_autogen.cpp', 'wt') as out_file:
        out_file.write(output)
        out_file.close()
