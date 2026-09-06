"""
DOM Workspace: Utilities for sanitizing, unwrapping, and visualizing
obfuscated or deeply nested Angular/modern web application DOM trees.
"""
import re
from pathlib import Path

from typing import Iterable, List, Optional, Set
from bs4 import BeautifulSoup, BeautifulSoup as bs, Comment, NavigableString, Tag

from .render import *


def load_soup(source: str, is_file: bool = True) -> BeautifulSoup:
    """Load and parse HTML from a file path or raw string using lxml."""
    if is_file:
        with open(source, "r", encoding="utf-8") as f:
            return BeautifulSoup(f, "lxml")
    return BeautifulSoup(source, "lxml")


def strip_comments(soup: BeautifulSoup) -> BeautifulSoup:
    """Remove all HTML comments (*ngIf, *ngFor, dynamic templates)."""
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()
    return soup


def strip_tags(
    soup: BeautifulSoup,
    tags_to_drop: Iterable[str] = ("script", "style", "noscript", "svg", "link", "meta"),
    tag_patterns: Iterable[str] = []
) -> BeautifulSoup:
    """Decompose non-structural or visually heavy elements completely."""
    for tag in soup.find_all(list(tags_to_drop)):
        tag.decompose()
    
    for p in [re.compile(p) for p in tag_patterns]:
        for tag in soup.find_all(p):
            tag.decompose()    
    return soup


def strip_ng_attribute_keys(
    soup: BeautifulSoup,
    patterns: Iterable[str] =  [r"^_ng(content|host)-.*", r"^aria-.*"]
) -> BeautifulSoup:
    """Remove transient Angular build/scoping hash attributes."""
    compiled_patterns = [re.compile(pattern) for pattern in patterns]

    elements = soup.find_all(True)
    
    for compiled_pattern in compiled_patterns:
        for element in elements:
            for attr in list(element.attrs.keys()):
                if compiled_pattern.match(attr):
                    del element.attrs[attr]
    return soup

def unwrap_named_tags(
    soup: BeautifulSoup,
    tags_to_unwrap: Iterable[str] = ("ng-container", "ng-template"),
) -> BeautifulSoup:
    """Unwrap specific container tags while retaining their child nodes."""
    for tag in soup.find_all(list(tags_to_unwrap)):
        tag.unwrap()
    return soup


def unwrap_empty_containers(
    soup: BeautifulSoup,
    container_tags: Iterable[str] = ("div", "span", "pre"),
    preserve_classes: bool = False,
) -> BeautifulSoup:
    """
    Iteratively hoist child elements out of non-semantic wrapper tags
    that have no attributes (or no classes if preserve_classes=False).
    """
    flattened = True
    tags = list(container_tags)
    while flattened:
        flattened = False
        for node in soup.find_all(tags):
            # Check if container is bare
            if not node.attrs or (not preserve_classes and not node.get("id") and not node.get("class")):
                if len(node.contents) > 0:
                    node.unwrap()
                    flattened = True
    return soup


def sanitize_angular_dom(
    soup: BeautifulSoup,
    drop_tags: Iterable[str] = ("script", "style", "noscript", "svg"),
    drop_tag_patterns: Iterable[str] = (r"^freemium-.*",),
    drop_attributes: Iterable[str] = (r"^_ng(content|host)-.*",),
    drop_attr_values: Iterable[str] = (r"NOOP"),
    unwrap_tags: Iterable[str] = ("ng-container", "ng-template"),
    flatten_bare_divs: bool = True,
) -> BeautifulSoup:
    """Convenience pipeline running standard cleanup passes in order."""

    strip_comments(soup)

    strip_tags(soup, drop_tags, drop_tag_patterns)
    strip_ng_attribute_keys(soup, drop_attributes)
    strip_attribute_values(soup, drop_attr_values)

    unwrap_named_tags(soup, unwrap_tags)
    if flatten_bare_divs:
        unwrap_empty_containers(soup)
    return soup


def strip_attribute_values(
    soup: BeautifulSoup,
    patterns: Iterable[str] = (r"^(luminous)-.*",)
) -> BeautifulSoup:
    """Remove attribute values matching patterns ."""
    compiled_patterns = [re.compile(pattern) for pattern in patterns]

    # print(compiled_patterns)

    for compiled_pattern in compiled_patterns:
        for element in soup.find_all(True):
            for attr in list(element.attrs.keys()):
                for attr_val in element[attr]:
                    if compiled_pattern.match(attr_val):
                        del element[attr]
    return soup

def do_process(input_file, output_file: str = ""):
    soup = load_soup(input_file)

    do_output(soup, "pretty-html/pretty-html_mixed.html")
    
    new_soup = load_soup(input_file)
    sanitize_angular_dom(new_soup)
    do_output(new_soup, "cleaned-html/cleaned-html_mixed.html")
    
    # do_output(new_soup)
    
    stripped_tags = [
        "script",
        "style",
        "noscript",
        "svg",
        "input-container",
        "gem-icon-button",
        "model-response-disclaimers",
        "freemium-rag-disclaimer",
        "sensitive-memories-banner",
        "thinking-overlay"        
    ]
    
    strip_attribute_patterns = [
        r"^_ng(content|host)-.*",
        r"^aria.*",
        r"^style",
        r"^jslog",
        r"^data-hveid",
        r".*data-ved.*"
    ]
    
    strip_attribute_value_patterns =  [
        r"^_ng(content|host)-.*",
        r"^ng-tns.*",
        r".*luminous.*",
        r"^enable-lr26-response-chrome-updates$"
    ]
    
    sanitize_angular_dom(
        soup,
        drop_tags=stripped_tags,
        drop_attributes=strip_attribute_patterns,
        drop_attr_values=strip_attribute_value_patterns,
    )

    turns = soup(class_="conversation-container")
    for i,t in enumerate(turns):
        ts = f"Turn: {i}"
        turn_comment = bs(f"<!-- {ts}  --><!-- {ts} --><!-- {ts} -->", "lxml")
        t.insert_before(turn_comment)

    user_queries = soup(class_="query-content")
    for uq in user_queries:
        uq.clear()

    message_actions = soup("message-actions")
    for ma in message_actions:
        ma.clear()


    code_blocks = soup("code-block")
    print(
        code_blocks[0].prettify()
    )
    
    
    do_output(soup, "stripped-html/stripped_mixed.html")
