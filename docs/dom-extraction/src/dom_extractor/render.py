from bs4 import BeautifulSoup, BeautifulSoup as bs, Comment, NavigableString, Tag
from typing import Iterable, List, Optional, Set



def render_dom_tree(
    node: Tag,
    prefix: str = "",
    is_last: bool = True,
    max_depth: int = 15,
    current_depth: int = 0,
    show_attrs: bool = True,
    max_text_len: int = 40,
) -> List[str]:
    """
    Recursively renders a node into standard Unix `tree` styled output.
    Displays tag names, IDs, classes, and truncated text content.
    """
    if current_depth > max_depth or not isinstance(node, Tag):
        return []

    lines = []
    
    # Format current node summary
    connector = "└── " if is_last else "├── "
    label = [f"<{node.name}>"]

    if show_attrs:
        if node.get("id"):
            label.append(f"#{node['id']}")
        if node.get("class"):
            classes = ".".join(node["class"]) if isinstance(node["class"], list) else node["class"]
            label.append(f".{classes}")

    # Extract non-empty immediate inline text summary if present
    direct_texts = [
        c.strip() for c in node.children
        if isinstance(c, NavigableString) and not isinstance(c, Comment) and c.strip()
    ]
    if direct_texts:
        text_preview = " ".join(direct_texts)
        if len(text_preview) > max_text_len:
            text_preview = text_preview[:max_text_len] + "..."
        label.append(f'"{text_preview}"')

    current_line = f"{prefix}{connector}{' '.join(label)}"
    lines.append(current_line)

    # Filter direct child element tags
    child_tags = [c for c in node.children if isinstance(c, Tag)]
    total_children = len(child_tags)

    next_prefix = prefix + ("    " if is_last else "│   ")

    for idx, child in enumerate(child_tags):
        child_is_last = (idx == total_children - 1)
        child_lines = render_dom_tree(
            node=child,
            prefix=next_prefix,
            is_last=child_is_last,
            max_depth=max_depth,
            current_depth=current_depth + 1,
            show_attrs=show_attrs,
            max_text_len=max_text_len,
        )
        lines.extend(child_lines)
    return lines

def construct_tree(
    soup_or_tag: Tag,
    max_depth: int = 10,
    show_attrs: bool = True,
) -> str:
    """Entry point to print or save the tree rendering."""
    target = soup_or_tag.body if hasattr(soup_or_tag, "body") and soup_or_tag.body else soup_or_tag
    tree_lines = render_dom_tree(
        node=target,
        prefix="",
        is_last=True,
        max_depth=max_depth,
        show_attrs=show_attrs,
    )
    output_text = "\n".join(tree_lines)
    
    return output_text

def do_output(soup, output_file: str = ""):
    if len(output_file) > 0:
        with open(output_file, "w", encoding="utf-8") as f:        
            f.write(soup.prettify())
    else:
        print(soup.prettify())
