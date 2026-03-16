import pytest
from src.data_cleaning.data import _get_project_data_dir, load_data, clean_data, balance_classes
import pandas as pd
# A faire peut etre avant : python3 -m pip install pytest
# Et pip install -r requirements.txt

DATA_FILENAME = "reddit_depression_dataset.csv"

def test_load_data():
    df = load_data()
    assert type(df) == pd.DataFrame

def test_clean_data():
    df = load_data()
    df_cleaned = clean_data(df)
    assert type(df_cleaned) == pd.DataFrame
    assert df_cleaned.isna().sum().sum() == 0
    assert df_cleaned.shape[1] == 2