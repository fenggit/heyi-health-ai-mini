Component({
  properties: {
    checked: {
      type: Boolean,
      value: false
    },
    // 'circle' 用于列表选择项（diet-plan constitution），'square' 用于协议勾选（login）
    shape: {
      type: String,
      value: 'circle'
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    handleTap() {
      if (this.data.disabled) return
      this.triggerEvent('change', { checked: !this.data.checked })
    }
  }
})
