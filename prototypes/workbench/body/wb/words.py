"""The studio's words, from the copywriter's list (`studio-words.json`, the keys of words-release.md that the studio shows: new.*, gate.language.*, check.*, species.*).
One file feeds the server (check names and fail lines, the species form's labels and help, the language messages, the Gate's rows) and the page (web/src/lib/words.ts imports the same file),
so the drawer, the cards, the CLI, the inspector and the server's refusals all say the same words. Player words are never written here: a missing key is a KeyError, never an invented string."""
import json
import os

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "studio-words.json")
_CACHE = {}


def all_words():
    if "w" not in _CACHE:
        with open(PATH, encoding="utf-8") as fh:
            _CACHE["w"] = json.load(fh)
    return _CACHE["w"]


def get(key, default=None):
    return all_words().get(key, default)


def say(key, **kw):
    """The word for a key with its {placeholders} filled."""
    return all_words()[key].format(**kw)
