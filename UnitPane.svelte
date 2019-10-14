<script>
  export let unit;

  const { 
    name,
    avatar: src,
    hp: {
      left,
      total
    }
  } = unit.charConfig;


</script> 

<div class="unit-pane">
    <img class="avatar" {src} alt="">
    <div class="unit-info">
      <p class="unit-name">{name}</p>
      <p class="hp-display"><span>HP</span> {left} / {total}</p>
    </div>
</div>

<style scoped type="text/scss">
  .unit-pane {
    position: absolute;
    bottom: 12px;
    left: 6px;

    box-sizing: border-box;
    background-color: white;
    padding: 6px;
    display: grid;
    grid-template-columns: 64px 144px;
    grid-gap: 6px;
    grid-template-rows: 64px;
    grid-template-areas: 
      "avatar unitinfo";
    border-radius: 6px;
    box-shadow: 4px 4px 8px 0px rgba(0,0,0,0.5);
  }
  .avatar {
    height: 64px;
    width: 64px;
    grid-area: avatar;
  }

  .unit-info {
    grid-area: unitinfo;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .unit-name {
    font-size: 1.1em;
    padding-bottom: 12px;
    margin: 0;
  }

  .hp-display {
    font-size: 1.25em;
    margin: 0;
    padding: 0;
  }
  
  .hp-display span {
    font-weight: bold;
  }
</style>