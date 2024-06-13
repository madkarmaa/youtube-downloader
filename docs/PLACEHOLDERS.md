The script provides some sort of "API" you can use to access _some_ video data. Placeholders are replaced with their corresponding value.

Let's say there's a key called `banana` and its associated value is `yellow`. If you create a string like so: `Bananas are {{ banana }}` then the script will replace the placeholders with its corresponding value, returning `Bananas are yellow`.

## Example placeholder: `{{ placeholder_name }}`

## Currently supported placeholder names

```
video_duration
```

```
video_url
```

```
video_author
```

```
video_title
```

```
video_id
```
