## What Was Not Found

### 1. No local Gate-2 expression dataset files
Not found:
- `data/gate2/dataset/angry/...`
- `data/gate2/dataset/fear/...`
- `data/gate2/dataset/happy/...`
- `data/gate2/dataset/neutral/...`
- `data/gate2/dataset/sad/...`
- `data/gate2/dataset/surprise/...`

Meaning:
- the dataset is not present in either visible project tree

### 2. No Gate-2 expression ZIP file
Not found:
- `gate2_expression_dataset.zip`
- any obviously matching image-dataset ZIP in either project tree

Meaning:
- the ZIP-based recovery path is not recoverable from the repos alone

### 3. No exact IEEE DataPort URL
Found:
- source name only

Not found:
- a full downloadable URL

Meaning:
- recovery still requires an external search or team memory

### 4. No personal local absolute path for the Gate-2 image dataset
Found for Gate-1 audio:
- `C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset\...`

Not found for Gate-2 images:
- no equivalent `C:\Users\...` path pointing to a facial-expression image dataset

Meaning:
- there is no clear pointer to where the Gate-2 dataset lived on disk

### 5. No notebook or archived backup containing the Gate-2 dataset source
Not found:
- relevant `.ipynb`
- archive folder with dataset files
- backup ZIP with Gate-2 images

Meaning:
- repository archaeology alone does not recover the data

## What This Means

The dataset source is partially identifiable but not directly recoverable from the repositories.

What is known with strong evidence:
- likely source name:
  - IEEE DataPort `"Facial Expression Dataset (Sri Lankan)"`
- intended local path:
  - `data/gate2/dataset`
- intended structure:
  - angry / fear / happy / neutral / sad / surprise
- intended ZIP-capable workflow:
  - `--data_url`
  - `gate2_expression_dataset.zip`

What remains unknown:
- the exact original download URL
- whether the dataset was customized before training
- where the original local copy lived

## Is Dataset Recovery Still Blocked?

Yes.

Recovery is still blocked by missing external/source access. The repo preserves enough evidence to guide a search, but not enough to directly restore the dataset from local files alone.

## External Follow-Up Still Required

1. Search IEEE DataPort for the exact dataset name preserved in the script.
2. Ask original contributors whether they still have:
   - the excluded `data/gate2/dataset` folder
   - the original ZIP used with `--data_url`
3. Check old local backups or drives outside the repo for:
   - `gate2_expression_dataset.zip`
   - `data/gate2/dataset`
   - any facial-expression image archive matching the six-class structure

