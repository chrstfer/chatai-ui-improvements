import sys
from .extractor import *

def main():
    if len(sys.argv) < 2:
        print("Usage: python dom_workspace.py <raw_dom.html> [output_tree.txt]")
        sys.exit(1)

    input_file = sys.argv[1] if len(sys.argv) > 1 else "raw_dom.html"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "clean_dom.html"

    do_process(input_file, output_file)
        
if __name__ == "__main__":
    main()
