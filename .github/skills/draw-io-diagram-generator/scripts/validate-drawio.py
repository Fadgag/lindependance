#!/usr/bin/env python3
"""Basic validator for .drawio files (mxGraph XML). This is intentionally lightweight
and only checks the rules in the skill description: root element, diagrams, id 0/1,
unique ids per diagram, vertex geometry presence, edges have source/target or sourcePoint/targetPoint.

Usage: python validate-drawio.py path/to/file.drawio
"""

import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

REQUIRED_ROOT = 'mxfile'


def error(msg):
    print('ERROR:', msg)


def info(msg):
    print('INFO:', msg)


def validate(path):
    try:
        tree = ET.parse(path)
    except ET.ParseError as e:
        error(f'XML parse error: {e}')
        return 2
    except Exception as e:
        error(f'Failed to open file: {e}')
        return 2

    root = tree.getroot()
    if root.tag != REQUIRED_ROOT:
        error(f'Root element is <{root.tag}>; expected <{REQUIRED_ROOT}>')
        return 2

    diagrams = root.findall('diagram')
    if not diagrams:
        error('No <diagram> elements found')
        return 2

    exit_code = 0
    for d in diagrams:
        did = d.get('id') or d.get('name') or '<unknown>'
        info(f'Validating diagram: {did}')
        # Parse as XML inside diagram element
        # diagram text is escaped XML; sometimes draw.io stores raw XML inside
        # the diagram element. Attempt to parse its text content.
        xml_text = d.text
        if not xml_text or not xml_text.strip():
            error(f'Diagram {did} is empty')
            exit_code = 2
            continue
        try:
            inner_root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            # sometimes diagram text is wrapped in CDATA or compressed. We can't handle compressed here.
            error(f'Diagram {did} inner XML parse error: {e}')
            exit_code = 2
            continue

        # find mxCell elements under root -> mxGraphModel -> root
        mxroot = inner_root.find('.//root')
        if mxroot is None:
            error(f'Diagram {did}: missing <root> element inside mxGraphModel')
            exit_code = 2
            continue

        cells = mxroot.findall('mxCell')
        if not cells:
            error(f'Diagram {did}: no <mxCell> elements found')
            exit_code = 2
            continue

        # Check id 0 and 1 are first two cells (approximate: check existence and order)
        ids = [c.get('id') for c in cells]
        if '0' not in ids or '1' not in ids:
            error(f'Diagram {did}: missing required ids 0 or 1 in mxCell list')
            exit_code = 2

        if ids[0] != '0' or ids[1] != '1':
            error(f'Diagram {did}: expected first two mxCell ids to be 0 and 1; got {ids[:2]}')
            exit_code = 2

        # Unique ids check
        seen = set()
        duplicates = []
        for cid in ids:
            if cid in seen:
                duplicates.append(cid)
            seen.add(cid)
        if duplicates:
            error(f'Diagram {did}: duplicated ids found: {duplicates}')
            exit_code = 2

        # Check vertices have mxGeometry
        for cell in cells:
            if cell.get('vertex') == '1':
                geom = cell.find('mxGeometry')
                if geom is None:
                    error(f'Diagram {did}: vertex cell id={cell.get("id")} missing <mxGeometry>')
                    exit_code = 2

        # Edges: must have source/target or geometry with sourcePoint+targetPoint
        for cell in cells:
            if cell.get('edge') == '1':
                src = cell.get('source')
                tgt = cell.get('target')
                geom = cell.find('mxGeometry')
                if not src or not tgt:
                    # check for sourcePoint/targetPoint children
                    if geom is None or geom.find('mxPoint') is None:
                        error(f'Diagram {did}: edge id={cell.get("id")} missing source/target and geometry points')
                        exit_code = 2

        # Parent references: every cell except id=0 should have parent referencing an existing id
        idset = set(ids)
        for cell in cells:
            cid = cell.get('id')
            if cid == '0':
                continue
            parent = cell.get('parent')
            if not parent:
                error(f'Diagram {did}: cell id={cid} missing parent attribute')
                exit_code = 2
            elif parent not in idset:
                error(f'Diagram {did}: cell id={cid} has parent={parent} which does not exist')
                exit_code = 2

    if exit_code == 0:
        info('Validation passed')
    else:
        error('Validation failed')
    return exit_code


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python validate-drawio.py <file.drawio>')
        sys.exit(2)
    path = sys.argv[1]
    rc = validate(path)
    sys.exit(rc)

