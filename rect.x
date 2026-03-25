const localX = worldX - rect.x;
  const localY = worldY - rect.y;
  
  const lastStroke = win.strokes[win.strokes.length - 1];
  if (
    !lastStroke ||
    lastStroke.points.length > 30 ||
    lastStroke.color !== win.paintColor ||
    lastStroke.size !== win.paintBrushSize
  ) {
    win.strokes.push({
      color: win.paintColor,
      size: win.paintBrushSize,
      points: [{ x: localX, y: localY }],
    });
  } else {
    const lastPoint = lastStroke.points[lastStroke.points.length - 1];
    const dx = localX - lastPoint.x;
    const dy = localY - lastPoint.y;
    if (dx * dx + dy * dy > 1.5 * 1.5) {
      lastStroke.points.push({ x: localX, y: localY });
    }
  }
}