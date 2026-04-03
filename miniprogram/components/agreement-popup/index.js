Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    content: { type: String, value: '' }
  },
  methods: {
    onConfirm() {
      this.triggerEvent('confirm')
    },
    onMaskTap() {
      // 点遮罩不关闭，需主动点按钮
    }
  }
})
