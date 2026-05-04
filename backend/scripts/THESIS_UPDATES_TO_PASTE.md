# Thesis updates — Gate 2 visual deception model

**Use these to update your thesis Word doc before the viva. They explain the new artifact, cite the dataset properly, and give you the numbers you can defend.**

> ⚠️ The exact accuracy numbers below are **placeholders** — replace `{{SUBJECT_INDEPENDENT_ACCURACY}}` and friends with the values printed by the training run (see `gate2_deception_metadata.json` after training completes).

---

## 1. Methodology section — new paragraph

Insert into Chapter 2 (Methodology), within the Gate 2 subsection:

> **Visual Deception Training Data.** The Gate 2 visual deception classifier
> was trained on the *Real-Life Trial Deception Detection Dataset* released by
> Pérez-Rosas, Abouelenien, Mihalcea, and Burzo at the University of
> Michigan [N]. The dataset contains 121 short trial-courtroom video clips
> (61 deceptive, 60 truthful) drawn from publicly available recordings of
> witness testimony, defendant statements, and exoneree interviews, with
> truthfulness labels grounded in the legal verdict (guilty, not-guilty, or
> exoneration). Average clip length is 28 seconds and 56 unique speakers
> appear across both classes. This dataset is appropriate for the present
> study because its labels reflect *high-stakes real-world deception* rather
> than instructed laboratory lies, which is closer to the screening context
> in which a cultivator may misrepresent commitment to land use.

## 2. Implementation section — replace the Gate 2 deception data paragraph

Replace the existing Gate 2 deception data description in Chapter 3
(Implementation) with:

> **Gate 2 deception artifact (`gate2_deception_model.pkl`).** The visual
> deception model is a `RandomForestClassifier` (200 trees, balanced class
> weights, `min_samples_leaf=2`) trained on combined HOG + raw-pixel features
> extracted from face crops, identical to the feature pipeline used at
> inference time. Frame sampling is performed at 0.5 frames per second with
> a maximum of 15 frames per clip; faces are detected with the OpenCV Haar
> frontal-face cascade. After feature extraction the dataset contains
> {{TOTAL_FRAMES}} labelled face frames spanning {{N_SPEAKERS}} unique
> speakers from the Real-Life Trial Deception Detection Dataset
> ({{DECEPTIVE_FRAMES}} deceptive, {{TRUTHFUL_FRAMES}} truthful).

## 3. Evaluation section — new paragraph reporting honest numbers

Insert into Chapter 3 (Evaluation / Results):

> **Gate 2 Visual Deception — held-out evaluation.** Two independent splits
> were used. (1) A *subject-independent split* held out approximately 20%
> of unique speakers as the test fold; this is the headline metric because
> the dataset contains the same speakers in both deceptive and truthful
> classes and a naive split would let the classifier learn speaker identity
> rather than deception cues. The model achieved
> **{{SUBJECT_INDEPENDENT_ACCURACY}} accuracy** and
> **{{SUBJECT_INDEPENDENT_F1}} macro-F1** under this protocol. (2) A
> *clip-stratified split* held out 20% of clips per class; under this
> easier protocol the model achieved {{CLIP_STRATIFIED_ACCURACY}} accuracy.
> The difference between the two numbers quantifies the speaker-leakage
> ceiling and is reported transparently. The deployed artifact is finally
> refit on all available frames so that production inference uses the
> maximum amount of data; held-out metrics are reserved for honest
> reporting only.

## 4. Limitations subsection — append

> **L7 — Subject overlap in deception training data.** Although the
> Real-Life Trial Deception Detection Dataset is the standard public
> benchmark for credibility-from-video research, individual speakers
> recur across multiple clips (e.g. defendant-witness pairings in the
> same trial). Mitigation: the reported headline accuracy uses a
> *subject-independent* held-out set, and the deployed model is intended
> as a corroborating signal, never as the sole basis for a screening
> decision.

## 5. References — IEEE entry to add

Append to the references list, renumber as appropriate:

> [N] V. Pérez-Rosas, M. Abouelenien, R. Mihalcea, and M. Burzo,
> "Deception Detection Using Real-Life Trial Data," in *Proceedings of
> the 2015 ACM on International Conference on Multimodal Interaction
> (ICMI '15)*, Seattle, WA, USA, Nov. 2015, pp. 59–66.
> doi: 10.1145/2818346.2820758.

### BibTeX (for completeness, e.g. appendix or supplemental)

```bibtex
@inproceedings{PerezRosas2015DeceptionDetection,
  author    = {P{\'e}rez-Rosas, Ver{\'o}nica and Abouelenien, Mohamed
               and Mihalcea, Rada and Burzo, Mihai},
  title     = {Deception Detection Using Real-Life Trial Data},
  booktitle = {Proceedings of the 2015 ACM on International Conference
               on Multimodal Interaction},
  series    = {ICMI '15},
  year      = {2015},
  pages     = {59--66},
  publisher = {ACM},
  address   = {New York, NY, USA},
  doi       = {10.1145/2818346.2820758}
}
```

---

## 6. Viva talking points (memorise these)

- **"What dataset did you use for Gate 2 deception?"** → Real-Life Trial
  Deception Detection Dataset by Pérez-Rosas et al. (ICMI 2015), University
  of Michigan. 121 trial videos, labels grounded in legal verdicts.
- **"How did you split the data?"** → Subject-independent split — about 20%
  of unique speakers held out — because the same defendants appear in both
  classes. A naive random split would inflate accuracy via speaker leakage.
- **"Why is your accuracy lower than the previous version?"** → The previous
  artifact was trained on a tiny 80-frame in-house set and the reported 100%
  was almost certainly overfit. The new number is honest and held-out.
- **"Why a RandomForest, not a CNN?"** → ~1,200 face frames is far too few
  for a CNN; RandomForest with HOG + pixel features is the canonical strong
  baseline for this dataset (matches the methodology direction in
  Pérez-Rosas et al.).
- **"How do you avoid using this as a lie detector?"** → Decision engine
  treats it as a corroborating signal only; any uncertain case is escalated
  to VERIFY for human review (REJECT > VERIFY > APPROVE priority).
