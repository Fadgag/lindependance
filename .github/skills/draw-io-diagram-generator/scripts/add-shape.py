#!/usr/bin/env python3
"""Very small helper to append a simple rectangular vertex to an uncompressed
.drawio file on the first diagram page. Usage:

python add-shape.py path/to/file.drawio "Label" x y [width] [height]

It will insert a new mxCell with a generated unique id at the end of the first
<diagram>'s mxGraphModel root. Not suitable for compressed or base64-encoded
diagram contents. This is a convenience helper for quick edits.
"""

import sys
import xml.etree.ElementTree as ET
import time


def gen_id(prefix='id'):
    return f"{prefix}-{int(time.time()*1000)}"


def usage_and_exit():
    print('Usage: python add-shape.py path/to/file.drawio "Label" x y [width] [height]')
    sys.exit(2)


def main():
    if len(sys.argv) < 4:
        usage_and_exit()
    path = sys.argv[1]
    label = sys.argv[2]
    x = sys.argv[3]
    y = sys.argv[4] if len(sys.argv) > 4 else '100'
    width = sys.argv[5] if len(sys.argv) > 5 else '120'
    height = sys.argv[6] if len(sys.argv) > 6 else '60'

    try:
        tree = ET.parse(path)
    except Exception as e:
        print('Failed to open file:', e)
        sys.exit(2)

    root = tree.getroot()
    diagram = root.find('diagram')
    if diagram is None or not diagram.text or not diagram.text.strip():
        print('First diagram missing or contains no inline XML (compressed/encoded?). Aborting.')
        sys.exit(2)

    # parse inner XML of diagram
    inner = ET.fromstring(diagram.text)
    mxroot = inner.find('.//root')
    if mxroot is None:
        print('No mxGraphModel root found inside first diagram. Aborting.')
        sys.exit(2)

    # create new mxCell
    new_id = gen_id('shape')
    cell = ET.Element('mxCell', {
        'id': new_id,
        'value': label,
        'style': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;',
        'vertex': '1',
        'parent': '1'
    })
    geom = ET.Element('mxGeometry', {
        'x': str(x), 'y': str(y), 'width': str(width), 'height': str(height), 'as': 'geometry'
    })
    cell.append(geom)
    mxroot.append(cell)

    # replace diagram's text with updated inner XML
    diagram.text = ET.tostring(inner, encoding='unicode')

    tree.write(path, encoding='utf-8', xml_declaration=True)
    print('Inserted shape id=', new_id)


if __name__ == '__main__':
    main()

