#!/usr/bin/env python3
"""
CLI script to strip color terms from text.
Called by Node.js to remove color-related terms from character descriptions for B&W prompts.
"""

import sys
from prompt_color_stripper import strip_color_terms


def main():
    if len(sys.argv) < 2:
        print("", file=sys.stderr)
        sys.exit(1)
    
    text = sys.argv[1]
    
    # Strip color terms and output result
    cleaned = strip_color_terms(text, preserve_bw_terms=True)
    print(cleaned)


if __name__ == '__main__':
    main()
