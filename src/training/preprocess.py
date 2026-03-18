import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import re
import html
import string


_NEGATION_WORDS = {"no", "not", "nor", "never", "n't"}
_STOP_WORDS = None

_LEMMATIZER = WordNetLemmatizer()

_CONTRACTIONS = {
    "can't": "can not",
    "won't": "will not",
    "n't": " not",
    "'re": " are",
    "'s": " is",
    "'d": " would",
    "'ll": " will",
    "'t": " not",
    "'ve": " have",
    "'m": " am",
}


def _expand_contractions(text: str) -> str:
    for contraction, expanded in _CONTRACTIONS.items():
        text = re.sub(re.escape(contraction), expanded, text)
    return text


def _get_stop_words() -> set:
    global _STOP_WORDS
    if _STOP_WORDS is None:
        _STOP_WORDS = set(stopwords.words('english')) - _NEGATION_WORDS
    return _STOP_WORDS


def _wordnet_pos(treebank_tag: str) -> str:
    if treebank_tag.startswith('J'):
        return 'a'
    if treebank_tag.startswith('V'):
        return 'v'
    if treebank_tag.startswith('N'):
        return 'n'
    if treebank_tag.startswith('R'):
        return 'r'
    return 'n'

def preprocess_text(text, remove_stopwords=True, remove_punctuation=True, lemmatize=True):
    tokens = word_tokenize(text)
    tokens = [t.lower() for t in tokens]
    
    if remove_punctuation:
        tokens = [
            t for t in tokens
            if t in {'!', '?'} or re.fullmatch(r"[a-z0-9_]+", t)
        ]
    
    if remove_stopwords:
        stop_words = _get_stop_words()
        tokens = [t for t in tokens if t not in stop_words]
    
    if lemmatize:
        try:
            pos_tags = nltk.pos_tag(tokens)
        except LookupError:
            pos_tags = [(t, 'N') for t in tokens]
        tokens = [_LEMMATIZER.lemmatize(t, _wordnet_pos(pos)) for t, pos in pos_tags]
    
    return ' '.join(tokens)

def clean_text(text: str) -> str:
    # Decode entities before normalization.
    text = html.unescape(text)

    # Keep social/URL signals as explicit tokens instead of dropping information.
    text = re.sub(r"https?://\S+|www\.\S+", " url_token ", text)
    text = re.sub(r"u/\w+", " user_token ", text)
    text = re.sub(r"r/ ?\w+", " subreddit_token ", text)

    # Preserve hashtag content while marking it.
    text = re.sub(r"#(\w+)", r" hashtag_\1 ", text)

    # Convert common emoticons and Unicode emojis to signal tokens.
    text = re.sub(r"(:\)|:-\)|:d|:-d|<3|;\))", " emoji_positive ", text, flags=re.IGNORECASE)
    text = re.sub(r"(:\(|:-\(|:'\(|:'-\(|:/|:-/|:\|)", " emoji_negative ", text, flags=re.IGNORECASE)
    text = re.sub(r"[\U0001F300-\U0001FAFF]", " emoji_token ", text)

    # Keep uppercase emphasis signal before lowercasing.
    text = re.sub(r"\b([A-Z]{2,})\b", r"\1 allcaps_token", text)

    text = text.lower()
    text = _expand_contractions(text)

    # Temporal and numeric cues can carry severity/context.
    text = re.sub(r"\b\d{1,2}(:\d{2})?\s?(am|pm)\b", " time_token ", text)
    text = re.sub(r"\b\d+([.,]\d+)?\b", " num_token ", text)

    text = text.replace("...", "three_dots")

    # Keep ! and ? for emotional intensity; map repeated punctuation to dedicated tokens.
    text = re.sub(r"!{2,}", " exclam_repeat ", text)
    text = re.sub(r"\?{2,}", " question_repeat ", text)

    punctuation_to_remove = string.punctuation.replace("!", "").replace("?", "").replace("'", "")
    text = re.sub(f"[{re.escape(punctuation_to_remove)}]", "", text)

    # Reduce elongated forms while preserving emphasis signal.
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text