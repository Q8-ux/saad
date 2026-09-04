(() => {
  const originalSelectGrade = window.selectGrade;
  if (typeof originalSelectGrade !== 'function') return;

  window.selectGrade = function(id) {
    originalSelectGrade(id);

    const grade = window.CURRICULUM && window.CURRICULUM[id];
    if (grade && Array.isArray(grade.units) && grade.units.length) {
      const firstUnit = grade.units[0];
      if (firstUnit && typeof window.openUnit === 'function') {
        window.openUnit(firstUnit.id);
      }
    }

    requestAnimationFrame(() => {
      const learning = document.querySelector('.learning-shell');
      if (learning) {
        learning.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };
})();
