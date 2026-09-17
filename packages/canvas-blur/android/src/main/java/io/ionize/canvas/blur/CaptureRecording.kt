package io.ionize.canvas.blur

import android.graphics.Canvas
import android.graphics.RenderNode
import android.view.View

/** Keeps sampled parent paint out of the content drawn visibly beneath it. */
internal class CaptureRecording {
  val content = RenderNode("CanvasCaptureContent").apply { setClipToBounds(false) }
  private var sample: RenderNode? = null
  val material: RenderNode get() = sample ?: content

  fun record(target: View, owner: PaintHost?, drawContent: (Canvas) -> Unit) {
    content.setPosition(0, 0, target.width, target.height)
    val visible = content.beginRecording(target.width, target.height)
    try { drawContent(visible) } finally { content.endRecording() }
    if (owner == null) {
      sample?.discardDisplayList()
      sample = null
      return
    }
    val composed = sample ?: RenderNode("CanvasCaptureMaterial").apply {
      setClipToBounds(false)
      sample = this
    }
    composed.setPosition(0, 0, target.width, target.height)
    val sampled = composed.beginRecording(target.width, target.height)
    try { owner.drawCapture(sampled, target) { it.drawRenderNode(content) } }
    finally { composed.endRecording() }
  }

  fun discard() {
    sample?.discardDisplayList()
    sample = null
    content.discardDisplayList()
  }
}

/** A stable foreground host owns no display lists while capture is inactive. */
internal class CaptureSession {
  var nodes: CaptureRecording? = null
    private set

  fun setActive(active: Boolean) {
    if (active && nodes == null) nodes = CaptureRecording()
    else if (!active) {
      nodes?.discard()
      nodes = null
    }
  }
}
