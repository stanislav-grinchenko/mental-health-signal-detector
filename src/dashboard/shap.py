from typing import Any


def get_shap_values(
	model: Any,
	X_train: Any,
	sample_size: int = 10_000,
	random_state: int = 42,
):
	"""Compute SHAP values from an existing model and training matrix."""
	import numpy as np

	try:
		import shap
	except ImportError as exc:
		raise ImportError(
			"SHAP is not installed. Install it with `pip install shap` to use this function."
		) from exc

	if model is None:
		raise ValueError("model cannot be None.")
	if X_train is None:
		raise ValueError("X_train cannot be None.")

	n_rows = X_train.shape[0]
	if n_rows == 0:
		raise ValueError("X_train is empty; cannot compute SHAP values.")

	explainer = shap.Explainer(model, X_train)
	return explainer(X_train)


def shap_graph(
	shap_values: Any,
	vectorizer: Any | None = None,
	max_display: int = 20,
	show: bool = True,
):
	"""Plot the first SHAP bar graph from precomputed SHAP values."""
	import matplotlib.pyplot as plt

	try:
		import shap
	except ImportError as exc:
		raise ImportError(
			"SHAP is not installed. Install it with `pip install shap` to use this function."
		) from exc

	if shap_values is None:
		raise ValueError("shap_values cannot be None.")

	if vectorizer is not None and hasattr(vectorizer, "get_feature_names_out"):
		shap_values.feature_names = vectorizer.get_feature_names_out().tolist()

	shap.plots.bar(shap_values[0], max_display=max_display)
	plt.tight_layout()
	if show:
		plt.show()

